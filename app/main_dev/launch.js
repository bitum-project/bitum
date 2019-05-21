import { bitumwalletCfg, getWalletPath, getExecutablePath, bitumdCfg, getBitumdRpcCert } from "./paths";
import { getWalletCfg, readBitumdConfig } from "../config";
import { createLogger, AddToBitumdLog, AddToBitumwalletLog, GetBitumdLogs,
  GetBitumwalletLogs, lastErrorLine, lastPanicLine, ClearBitumwalletLogs, CheckDaemonLogs } from "./logging";
import parseArgs from "minimist";
import { OPTIONS } from "./constants";
import os from "os";
import fs from "fs-extra";
import stringArgv from "string-argv";
import { concat, isString } from "lodash";

const argv = parseArgs(process.argv.slice(1), OPTIONS);
const debug = argv.debug || process.env.NODE_ENV === "development";
const logger = createLogger(debug);

let bitumdPID;
let bitumwPID;

// windows-only stuff
let bitumwPipeRx;
let bitumdPipeRx;

let bitumwPort;

function closeClis() {
  // shutdown daemon and wallet.
  // Don't try to close if not running.
  if(bitumdPID && bitumdPID !== -1)
    closeBITUMD(bitumdPID);
  if(bitumwPID && bitumwPID !== -1)
    closeBITUMW(bitumwPID);
}

export function closeBITUMD() {
  if (require("is-running")(bitumdPID) && os.platform() != "win32") {
    logger.log("info", "Sending SIGINT to bitumd at pid:" + bitumdPID);
    process.kill(bitumdPID, "SIGINT");
    bitumdPID = null;
  } else if (require("is-running")(bitumdPID)) {
    try {
      const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
      win32ipc.closePipe(bitumdPipeRx);
      bitumdPID = null;
    } catch (e) {
      logger.log("error", "Error closing bitumd piperx: " + e);
      return false;
    }
  }
  return true;
}

export const closeBITUMW = () => {
  try {
    if (require("is-running")(bitumwPID) && os.platform() != "win32") {
      logger.log("info", "Sending SIGINT to bitumwallet at pid:" + bitumwPID);
      process.kill(bitumwPID, "SIGINT");
    } else if (require("is-running")(bitumwPID)) {
      try {
        const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
        win32ipc.closePipe(bitumwPipeRx);
      } catch (e) {
        logger.log("error", "Error closing bitumwallet piperx: " + e);
      }
    }
    bitumwPID = null;
    return true;
  } catch (e) {
    logger.log("error", "error closing wallet: " + e);
    return false;
  }
};

export async function cleanShutdown(mainWindow, app) {
  // Attempt a clean shutdown.
  return new Promise(resolve => {
    const cliShutDownPause = 2; // in seconds.
    const shutDownPause = 3; // in seconds.
    closeClis();
    // Sent shutdown message again as we have seen it missed in the past if they
    // are still running.
    setTimeout(function () { closeClis(); }, cliShutDownPause * 1000);
    logger.log("info", "Closing bitum.");

    let shutdownTimer = setInterval(function () {
      const stillRunning = (require("is-running")(bitumdPID) && os.platform() != "win32");

      if (!stillRunning) {
        logger.log("info", "Final shutdown pause. Quitting app.");
        clearInterval(shutdownTimer);
        if (mainWindow) {
          mainWindow.webContents.send("daemon-stopped");
          setTimeout(() => { mainWindow.close(); app.quit(); }, 1000);
        } else {
          app.quit();
        }
        resolve(true);
      }
      logger.log("info", "Daemon still running in final shutdown pause. Waiting.");

    }, shutDownPause * 1000);
  });
}

export const launchBITUMD = (mainWindow, daemonIsAdvanced, daemonPath, appdata, testnet, reactIPC) => {
  const spawn = require("child_process").spawn;
  let args = [ "--nolisten" ];
  let newConfig = {};
  if (appdata) {
    args.push(`--appdata=${appdata}`);
    newConfig = readBitumdConfig(appdata, testnet);
    newConfig.rpc_cert = getBitumdRpcCert(appdata);
  } else {
    args.push(`--configfile=${bitumdCfg(daemonPath)}`);
    newConfig = readBitumdConfig(daemonPath, testnet);
    newConfig.rpc_cert = getBitumdRpcCert();
  }
  if (testnet) {
    args.push("--testnet");
  }

  const bitumdExe = getExecutablePath("bitumd", argv.customBinPath);
  if (!fs.existsSync(bitumdExe)) {
    logger.log("error", "The bitumd executable does not exist. Expected to find it at " + bitumdExe);
    return;
  }

  if (os.platform() == "win32") {
    try {
      const util = require("util");
      const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
      bitumdPipeRx = win32ipc.createPipe("out");
      args.push(util.format("--piperx=%d", bitumdPipeRx.readEnd));
    } catch (e) {
      logger.log("error", "can't find proper module to launch bitumd: " + e);
    }
  }

  logger.log("info", `Starting ${bitumdExe} with ${args}`);

  const bitumd = spawn(bitumdExe, args, {
    detached: os.platform() == "win32",
    stdio: [ "ignore", "pipe", "pipe" ]
  });

  bitumd.on("error", function (err) {
    logger.log("error", "Error running bitumd.  Check logs and restart! " + err);
    mainWindow.webContents.executeJavaScript("alert(\"Error running bitumd.  Check logs and restart! " + err + "\");");
    mainWindow.webContents.executeJavaScript("window.close();");
  });

  bitumd.on("close", (code) => {
    if (daemonIsAdvanced)
      return;
    if (code !== 0) {
      var lastBitumdErr = lastErrorLine(GetBitumdLogs());
      if (!lastBitumdErr || lastBitumdErr == "") {
        lastBitumdErr = lastPanicLine(GetBitumdLogs());
        console.log("panic error", lastBitumdErr);
      }
      logger.log("error", "bitumd closed due to an error: ", lastBitumdErr);
      reactIPC.send("error-received", true, lastBitumdErr);
    } else {
      logger.log("info", `bitumd exited with code ${code}`);
    }
  });

  bitumd.stdout.on("data", (data) => {
    AddToBitumdLog(process.stdout, data, debug);
    if (CheckDaemonLogs(data)) {
      reactIPC.send("warning-received", true, data.toString("utf-8"));
    }
  });
  bitumd.stderr.on("data", (data) => AddToBitumdLog(process.stderr, data, debug));

  newConfig.pid = bitumd.pid;
  bitumdPID = bitumd.pid;
  logger.log("info", "bitumd started with pid:" + newConfig.pid);

  bitumd.unref();
  return newConfig;
};

// DecodeDaemonIPCData decodes messages from an IPC message received from bitumd/
// bitumwallet using their internal IPC protocol.
// NOTE: very simple impl for the moment, will break if messages get split
// between data calls.
const DecodeDaemonIPCData = (logger, data, cb) => {
  let i = 0;
  while (i < data.length) {
    if (data[i++] !== 0x01) throw "Wrong protocol version when decoding IPC data";
    const mtypelen = data[i++];
    const mtype = data.slice(i, i+mtypelen).toString("utf-8");
    i += mtypelen;
    const psize = data.readUInt32LE(i);
    i += 4;
    const payload = data.slice(i, i+psize);
    i += psize;
    cb(mtype, payload);
  }
};

export const launchBITUMWallet = (mainWindow, daemonIsAdvanced, walletPath, testnet, reactIPC) => {
  const spawn = require("child_process").spawn;
  let args = [ "--configfile=" + bitumwalletCfg(getWalletPath(testnet, walletPath)) ];

  const cfg = getWalletCfg(testnet, walletPath);

  args.push("--ticketbuyer.nospreadticketpurchases");
  args.push("--ticketbuyer.balancetomaintainabsolute=" + cfg.get("balancetomaintain"));
  args.push("--addridxscanlen=" + cfg.get("gaplimit"));

  const bitumwExe = getExecutablePath("bitumwallet", argv.customBinPath);
  if (!fs.existsSync(bitumwExe)) {
    logger.log("error", "The bitumwallet executable does not exist. Expected to find it at " + bitumwExe);
    return;
  }

  if (os.platform() == "win32") {
    try {
      const util = require("util");
      const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
      bitumwPipeRx = win32ipc.createPipe("out");
      args.push(util.format("--piperx=%d", bitumwPipeRx.readEnd));
    } catch (e) {
      logger.log("error", "can't find proper module to launch bitumwallet: " + e);
    }
  } else {
    args.push("--rpclistenerevents");
    args.push("--pipetx=4");
  }

  // Add any extra args if defined.
  if (argv.extrawalletargs !== undefined && isString(argv.extrawalletargs)) {
    args = concat(args, stringArgv(argv.extrawalletargs));
  }

  logger.log("info", `Starting ${bitumwExe} with ${args}`);

  const bitumwallet = spawn(bitumwExe, args, {
    detached: os.platform() == "win32",
    stdio: [ "ignore", "pipe", "pipe", "ignore", "pipe" ]
  });

  const notifyGrpcPort = (port) => {
    bitumwPort = port;
    logger.log("info", "wallet grpc running on port", port);
    mainWindow.webContents.send("bitumwallet-port", port);
  };

  bitumwallet.stdio[4].on("data", (data) => DecodeDaemonIPCData(logger, data, (mtype, payload) => {
    if (mtype === "grpclistener") {
      const intf = payload.toString("utf-8");
      const matches = intf.match(/^.+:(\d+)$/);
      if (matches) {
        notifyGrpcPort(matches[1]);
      } else {
        logger.log("error", "GRPC port not found on IPC channel to bitumwallet: " + intf);
      }
    }
  }));

  bitumwallet.on("error", function (err) {
    logger.log("error", "Error running bitumwallet.  Check logs and restart! " + err);
    mainWindow.webContents.executeJavaScript("alert(\"Error running bitumwallet.  Check logs and restart! " + err + "\");");
    mainWindow.webContents.executeJavaScript("window.close();");
  });

  bitumwallet.on("close", (code) => {
    if (daemonIsAdvanced)
      return;
    if (code !== 0) {
      var lastBitumwalletErr = lastErrorLine(GetBitumwalletLogs());
      if (!lastBitumwalletErr || lastBitumwalletErr == "") {
        lastBitumwalletErr = lastPanicLine(GetBitumwalletLogs());
      }
      logger.log("error", "bitumwallet closed due to an error: ", lastBitumwalletErr);
      reactIPC.send("error-received", false, lastBitumwalletErr);
    } else {
      logger.log("info", `bitumwallet exited with code ${code}`);
    }
    ClearBitumwalletLogs();
  });

  const addStdoutToLogListener = (data) => AddToBitumwalletLog(process.stdout, data, debug);

  // waitForGrpcPortListener is added as a stdout on("data") listener only on
  // win32 because so far that's the only way we found to get back the grpc port
  // on that platform. For linux/macOS users, the --pipetx argument is used to
  // provide a pipe back to bitum, which reads the grpc port in a secure and
  // reliable way.
  const waitForGrpcPortListener = (data) => {
    const matches = /BITUMW: gRPC server listening on [^ ]+:(\d+)/.exec(data);
    if (matches) {
      notifyGrpcPort(matches[1]);
      // swap the listener since we don't need to keep looking for the port
      bitumwallet.stdout.removeListener("data", waitForGrpcPortListener);
      bitumwallet.stdout.on("data", addStdoutToLogListener);
    }
    AddToBitumwalletLog(process.stdout, data, debug);
  };

  bitumwallet.stdout.on("data", os.platform() == "win32" ? waitForGrpcPortListener : addStdoutToLogListener);
  bitumwallet.stderr.on("data", (data) => {
    AddToBitumwalletLog(process.stderr, data, debug);
  });

  bitumwPID = bitumwallet.pid;
  logger.log("info", "bitumwallet started with pid:" + bitumwPID);

  bitumwallet.unref();
  return bitumwPID;
};

export const GetBitumwPort = () => bitumwPort;

export const GetBitumdPID = () => bitumdPID;

export const GetBitumwPID = () => bitumwPID;

export const readExesVersion = (app, grpcVersions) => {
  let spawn = require("child_process").spawnSync;
  let args = [ "--version" ];
  let exes = [ "bitumd", "bitumwallet", "bitumctl" ];
  let versions = {
    grpc: grpcVersions,
    bitum: app.getVersion()
  };

  for (let exe of exes) {
    let exePath = getExecutablePath("bitumd", argv.customBinPath);
    if (!fs.existsSync(exePath)) {
      logger.log("error", "The bitumd executable does not exist. Expected to find it at " + exePath);
    }

    let proc = spawn(exePath, args, { encoding: "utf8" });
    if (proc.error) {
      logger.log("error", `Error trying to read version of ${exe}: ${proc.error}`);
      continue;
    }

    let versionLine = proc.stdout.toString();
    if (!versionLine) {
      logger.log("error", `Empty version line when reading version of ${exe}`);
      continue;
    }

    let decodedLine = versionLine.match(/\w+ version ([^\s]+)/);
    if (decodedLine !== null) {
      versions[exe] = decodedLine[1];
    } else {
      logger.log("error", `Unable to decode version line ${versionLine}`);
    }
  }

  return versions;
};
