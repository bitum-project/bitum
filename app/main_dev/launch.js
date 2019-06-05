import { bitumwalletCfg, getWalletPath, getExecutablePath, bitumdCfg, getBitumdPath } from "./paths";
import { getWalletCfg, readBitumdConfig } from "../config";
import { createLogger, AddToBitumdLog, AddToBitumwalletLog, GetBitumdLogs,
  GetBitumwalletLogs, lastErrorLine, lastPanicLine, ClearBitumwalletLogs } from "./logging";
import parseArgs from "minimist";
import { OPTIONS } from "./constants";
import os from "os";
import fs from "fs-extra";
import util from "util";
import { spawn } from "child_process";
import isRunning from "is-running";
import stringArgv from "string-argv";
import { concat, isString } from "../fp";
import webSocket from "ws";

const argv = parseArgs(process.argv.slice(1), OPTIONS);
const debug = argv.debug || process.env.NODE_ENV === "development";
const logger = createLogger(debug);

let bitumdPID, bitumwPID;

// windows-only stuff
let bitumwPipeRx, bitumwPipeTx, bitumdPipeRx, bitumwTxStream;

let bitumwPort;
let rpcuser, rpcpass, rpccert, rpchost, rpcport;

let bitumdSocket = null;

function closeClis() {
  // shutdown daemon and wallet.
  // Don't try to close if not running.
  if(bitumdPID && bitumdPID !== -1)
    closeBITUMD(bitumdPID);
  if(bitumwPID && bitumwPID !== -1)
    closeBITUMW(bitumwPID);
}

export function closeBITUMD() {
  if (isRunning(bitumdPID) && os.platform() != "win32") {
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
    if (isRunning(bitumwPID) && os.platform() != "win32") {
      logger.log("info", "Sending SIGINT to bitumwallet at pid:" + bitumwPID);
      process.kill(bitumwPID, "SIGINT");
    } else if (isRunning(bitumwPID)) {
      try {
        const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
        bitumwTxStream.close();
        win32ipc.closePipe(bitumwPipeTx);
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
      const stillRunning = bitumdPID !== -1 && (isRunning(bitumdPID) && os.platform() != "win32");

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

export const launchBITUMD = (params, testnet) => new Promise((resolve,reject) => {
  let rpcCreds, appdata;

  rpcCreds = params && params.rpcCreds;
  appdata = params && params.appdata;

  if (rpcCreds) {
    rpcuser = rpcCreds.rpc_user;
    rpcpass = rpcCreds.rpc_pass;
    rpccert = rpcCreds.rpc_cert;
    rpchost = rpcCreds.rpc_host;
    rpcport = rpcCreds.rpc_port;
    bitumdPID = -1;
    return resolve(rpcCreds);
  }
  if (bitumdPID === -1) {
    const creds = {
      rpc_user: rpcuser,
      rpc_pass: rpcpass,
      rpc_cert: rpccert,
      rpc_host: rpchost,
      rpc_port: rpcport,
    };
    return resolve(creds);
  }

  if (!appdata) appdata = getBitumdPath();

  let args = [ "--nolisten" ];
  const newConfig = readBitumdConfig(appdata, testnet);

  args.push(`--configfile=${bitumdCfg(appdata)}`);
  args.push(`--appdata=${appdata}`);

  if (testnet) {
    args.push("--testnet");
  }
  rpcuser = newConfig.rpc_user;
  rpcpass = newConfig.rpc_pass;
  rpccert = newConfig.rpc_cert;
  rpchost = newConfig.rpc_host;
  rpcport = newConfig.rpc_port;

  const bitumdExe = getExecutablePath("bitumd", argv.custombinpath);
  if (!fs.existsSync(bitumdExe)) {
    logger.log("error", "The bitumd executable does not exist. Expected to find it at " + bitumdExe);
    return;
  }

  if (os.platform() == "win32") {
    try {
      const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
      bitumdPipeRx = win32ipc.createPipe("out");
      args.push(util.format("--piperx=%d", bitumdPipeRx.readEnd));
    } catch (e) {
      logger.log("error", "can't find proper module to launch bitumd: " + e);
    }
  }

  logger.log("info", `Starting ${bitumdExe} with ${args}`);

  const bitumd = spawn(bitumdExe, args, {
    detached: os.platform() === "win32",
    stdio: [ "ignore", "pipe", "pipe" ]
  });

  bitumd.on("error", function (err) {
    reject(err);
  });

  bitumd.on("close", (code) => {
    if (code !== 0) {
      let lastBitumdErr = lastErrorLine(GetBitumdLogs());
      if (!lastBitumdErr || lastBitumdErr === "") {
        lastBitumdErr = lastPanicLine(GetBitumdLogs());
      }
      logger.log("error", "bitumd closed due to an error: ", lastBitumdErr);
      return reject(lastBitumdErr);
    }

    logger.log("info", `bitumd exited with code ${code}`);
  });

  bitumd.stdout.on("data", (data) => {
    AddToBitumdLog(process.stdout, data, debug);
    resolve(data.toString("utf-8"));
  });

  bitumd.stderr.on("data", (data) => {
    AddToBitumdLog(process.stderr, data, debug);
    reject(data.toString("utf-8"));
  });

  newConfig.pid = bitumd.pid;
  bitumdPID = bitumd.pid;
  logger.log("info", "bitumd started with pid:" + newConfig.pid);

  bitumd.unref();
  return resolve(newConfig);
});

// DecodeDaemonIPCData decodes messages from an IPC message received from bitumd/
// bitumwallet using their internal IPC protocol.
// NOTE: very simple impl for the moment, will break if messages get split
// between data calls.
const DecodeDaemonIPCData = (data, cb) => {
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
  let args = [ "--configfile=" + bitumwalletCfg(getWalletPath(testnet, walletPath)) ];

  const cfg = getWalletCfg(testnet, walletPath);

  args.push("--gaplimit=" + cfg.get("gaplimit"));

  const bitumwExe = getExecutablePath("bitumwallet", argv.custombinpath);
  if (!fs.existsSync(bitumwExe)) {
    logger.log("error", "The bitumwallet executable does not exist. Expected to find it at " + bitumwExe);
    return;
  }

  const notifyGrpcPort = (port) => {
    bitumwPort = port;
    logger.log("info", "wallet grpc running on port", port);
    mainWindow.webContents.send("bitumwallet-port", port);
  };

  const decodeBitumwIPC = data => DecodeDaemonIPCData(data, (mtype, payload) => {
    if (mtype === "grpclistener") {
      const intf = payload.toString("utf-8");
      const matches = intf.match(/^.+:(\d+)$/);
      if (matches) {
        notifyGrpcPort(matches[1]);
      } else {
        logger.log("error", "GRPC port not found on IPC channel to bitumwallet: " + intf);
      }
    }
  });

  if (os.platform() == "win32") {
    try {
      const win32ipc = require("../node_modules/win32ipc/build/Release/win32ipc.node");
      bitumwPipeRx = win32ipc.createPipe("out");
      args.push(util.format("--piperx=%d", bitumwPipeRx.readEnd));

      bitumwPipeTx = win32ipc.createPipe("in");
      args.push(util.format("--pipetx=%d", bitumwPipeTx.writeEnd));
      args.push("--rpclistenerevents");
      const pipeTxReadFd = win32ipc.getPipeEndFd(bitumwPipeTx.readEnd);
      bitumwPipeTx.readEnd = -1; // -1 == INVALID_HANDLE_VALUE

      bitumwTxStream = fs.createReadStream("", { fd: pipeTxReadFd });
      bitumwTxStream.on("data", decodeBitumwIPC);
      bitumwTxStream.on("error", (e) => e && e.code && e.code != "EOF" && logger.log("error", "tx stream error", e));
      bitumwTxStream.on("close", () => logger.log("info", "bitumwallet tx stream closed"));
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

  if (os.platform() !== "win32") {
    bitumwallet.stdio[4].on("data", decodeBitumwIPC);
  }

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

  bitumwallet.stdout.on("data", addStdoutToLogListener);
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
  let args = [ "--version" ];
  let exes = [ "bitumd", "bitumwallet", "bitumctl" ];
  let versions = {
    grpc: grpcVersions,
    bitum: app.getVersion()
  };

  for (let exe of exes) {
    let exePath = getExecutablePath("bitumd", argv.custombinpath);
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

// connectDaemon starts a new rpc connection to bitumd
export const connectRpcDaemon = (mainWindow, rpcCreds) => {
  const rpc_host = rpcCreds ? rpcCreds.rpc_host : rpchost;
  const rpc_port = rpcCreds ? rpcCreds.rpc_port : rpcport;
  const rpc_user = rpcCreds ? rpcCreds.rpc_user : rpcuser;
  const rpc_pass = rpcCreds ? rpcCreds.rpc_pass : rpcpass;
  const rpc_cert = rpcCreds ? rpcCreds.rpc_cert : rpccert;

  var cert = fs.readFileSync(rpc_cert);
  const url = `${rpc_host}:${rpc_port}`;
  if (bitumdSocket && bitumdSocket.readyState === bitumdSocket.OPEN) {
    return mainWindow.webContents.send("connectRpcDaemon-response", { connected: true });
  }
  bitumdSocket = new webSocket(`wss://${url}/ws`, {
    headers: {
      "Authorization": "Basic "+Buffer.from(rpc_user+":"+rpc_pass).toString("base64")
    },
    cert: cert,
    ecdhCurve: "secp521r1",
    ca: [ cert ]
  });
  bitumdSocket.on("open", function() {
    logger.log("info","bitum has connected to bitumd instance");
    return mainWindow.webContents.send("connectRpcDaemon-response", { connected: true });
  });
  bitumdSocket.on("error", function(error) {
    logger.log("error",`Error: ${error}`);
    return mainWindow.webContents.send("connectRpcDaemon-response", { connected: false, error });
  });
  bitumdSocket.on("message", function(data) {
    const parsedData = JSON.parse(data);
    const id = parsedData ? parsedData.id : "";
    switch (id) {
    case "getinfo":
      mainWindow.webContents.send("check-getinfo-response", parsedData.result );
      break;
    case "getblockchaininfo": {
      const dataResults = parsedData.result || {};
      const blockCount = dataResults.blocks;
      const syncHeight = dataResults.syncheight;
      mainWindow.webContents.send("check-daemon-response", { blockCount, syncHeight });
      break;
    }
    }
  });
  bitumdSocket.on("close", () => {
    logger.log("info","bitum has disconnected to bitumd instance");
  });
};

export const getDaemonInfo = () => bitumdSocket.send("{\"jsonrpc\":\"1.0\",\"id\":\"getinfo\",\"method\":\"getinfo\",\"params\":[]}");

export const getBlockChainInfo = () => new Promise((resolve) => {
  if (bitumdSocket && bitumdSocket.readyState === bitumdSocket.CLOSED) {
    return resolve({});
  }
  bitumdSocket.send("{\"jsonrpc\":\"1.0\",\"id\":\"getblockchaininfo\",\"method\":\"getblockchaininfo\",\"params\":[]}");
});
