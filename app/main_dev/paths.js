import path from "path";
import os from "os";
import fs from "fs-extra";
import { initWalletCfg, newWalletConfigCreation } from "../config";

// In all the functions below the Windows path is constructed based on
// os.homedir() rather than using process.env.LOCALAPPDATA because in my tests
// that was available when using the standalone node but not there when using
// electron in production mode.
export function appDataDirectory() {
  if (os.platform() == "win32") {
    return path.join(os.homedir(), "AppData", "Local", "Bitum");
  } else if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library","Application Support","bitum");
  } else {
    return path.join(os.homedir(),".config","bitum");
  }
}

export function getGlobalCfgPath() {
  return path.resolve(appDataDirectory(), "config.json");
}

export function getWalletsDirectoryPath() {
  return path.join(appDataDirectory(), "wallets");
}

export function getWalletsDirectoryPathNetwork(testnet) {
  return path.join(appDataDirectory(), "wallets", testnet ? "testnet" : "mainnet");
}

export function getWalletPath(testnet, walletPath = "", testnet3) {
  const testnetStr = testnet ? "testnet" : "mainnet";
  const testnet3Str = testnet3 === true ? "testnet" : testnet3 === false ? "mainnet" : "";
  return path.join(getWalletsDirectoryPath(), testnetStr, walletPath, testnet3Str);
}

export function getDefaultWalletDirectory(testnet, testnet3) {
  return getWalletPath(testnet, "default-wallet", testnet3);
}

export function getDefaultWalletFilesPath(testnet, filePath = "") {
  return path.join(getDefaultWalletDirectory(testnet), filePath);
}

export function getWalletDBPathFromWallets(testnet, walletPath) {
  const network = testnet ? "testnet" : "mainnet";
  const networkFolder = testnet ? "testnet" : "mainnet";
  return path.join(getWalletsDirectoryPath(), network, walletPath, networkFolder, "wallet.db");
}

export function getBitumWalletDBPath(testnet) {
  return path.join(appDataDirectory(), testnet ? "testnet" : "mainnet", "wallet.db");
}

export function bitumctlCfg(configPath) {
  return path.resolve(configPath, "bitumctl.conf");
}

export function bitumdCfg(configPath) {
  return path.resolve(configPath, "bitumd.conf");
}

export function bitumwalletCfg(configPath) {
  return path.resolve(configPath, "bitumwallet.conf");
}

export function getBitumdPath() {
  if (os.platform() == "win32") {
    return path.join(os.homedir(), "AppData", "Local", "Bitumd");
  } else if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library","Application Support","bitumd");
  } else {
    return path.join(os.homedir(),".bitumd");
  }
}

export function getBitumwalletPath() {
  if (os.platform() == "win32") {
    return path.join(os.homedir(), "AppData", "Local", "Bitumwallet");
  } else if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library","Application Support","bitumwallet");
  } else {
    return path.join(os.homedir(),".bitumwallet");
  }
}

export function getBitumdRpcCert (appDataPath) {
  return path.resolve(appDataPath ? appDataPath : getBitumdPath(), "rpc.cert");
}

export function getExecutablePath(name, custombinpath) {
  let binPath = custombinpath ? custombinpath :
    process.env.NODE_ENV === "development"
      ? path.join(__dirname, "..", "..", "bin")
      : path.join(process.resourcesPath, "bin");
  let execName = os.platform() !== "win32" ? name : name + ".exe";

  return path.join(binPath, execName);
}

export function getDirectoryLogs(dir) {
  return path.join(dir, "logs");
}

export function checkAndInitWalletCfg (testnet) {
  const walletDirectory = getDefaultWalletDirectory(testnet);

  if (!fs.pathExistsSync(walletDirectory) && fs.pathExistsSync(getBitumWalletDBPath(testnet))) {
    fs.mkdirsSync(walletDirectory);

    // check for existing mainnet directories
    if ( fs.pathExistsSync(getBitumWalletDBPath(testnet)) ) {
      fs.copySync(getBitumWalletDBPath(testnet), path.join(getDefaultWalletDirectory(testnet, testnet),"wallet.db"));
    }

    // copy over existing config.json if it exists
    if (fs.pathExistsSync(getGlobalCfgPath())) {
      fs.copySync(getGlobalCfgPath(), getDefaultWalletFilesPath(testnet, "config.json"));
    }

    // create new configs for default mainnet wallet
    initWalletCfg(testnet, "default-wallet");
    newWalletConfigCreation(testnet, "default-wallet");
  }
}
