import fs from "fs-extra";
import path from "path";
import { createLogger } from "./logging";
import { getWalletPath, getWalletDBPathFromWallets, getBitumdPath } from "./paths";
import { initWalletCfg, newWalletConfigCreation, getWalletCfg, readBitumdConfig } from "../config";
import { launchBITUMD, launchBITUMWallet, GetBitumdPID, GetBitumwPID, closeBITUMD, closeBITUMW, GetBitumwPort } from "./launch";

const logger = createLogger();
let watchingOnlyWallet;

export const getAvailableWallets = (network) => {
  // Attempt to find all currently available wallet.db's in the respective network direction in each wallets data dir
  const availableWallets = [];
  const isTestNet = network !== "mainnet";

  const walletsBasePath = getWalletPath(isTestNet);
  const walletDirs = fs.readdirSync(walletsBasePath);
  walletDirs.forEach(wallet => {
    const walletDirStat = fs.statSync(path.join(walletsBasePath, wallet));
    if (!walletDirStat.isDirectory()) return;

    const cfg = getWalletCfg(isTestNet, wallet);
    const lastAccess = cfg.get("lastaccess");
    const watchingOnly = cfg.get("iswatchonly");
    const isTrezor = cfg.get("trezor");
    const walletDbFilePath = getWalletDBPathFromWallets(isTestNet, wallet);
    const finished = fs.pathExistsSync(walletDbFilePath);
    availableWallets.push({ network, wallet, finished, lastAccess, watchingOnly, isTrezor });
  });

  return availableWallets;
};

export const deleteDaemon = (appData, testnet) => {
  let removeDaemonDirectory = getBitumdPath();
  if (appData) removeDaemonDirectory = appData;
  let removeDaemonDirectoryData = path.join(removeDaemonDirectory, "data", testnet ? "testnet" : "mainnet");
  try {
    if (fs.pathExistsSync(removeDaemonDirectoryData)) {
      fs.removeSync(removeDaemonDirectoryData);
      logger.log("info", "removing " + removeDaemonDirectoryData);
    }
    return true;
  } catch (e) {
    logger.log("error", "error deleting daemon data: " + e);
    return false;
  }
};

export const startDaemon = async (params, testnet) => {
  if (GetBitumdPID() && GetBitumdPID() !== -1) {
    logger.log("info", "Skipping restart of daemon as it is already running " + GetBitumdPID());
    const appdata = params ? params.appdata : null;
    const newConfig = readBitumdConfig(appdata, testnet);

    newConfig.pid =  GetBitumdPID();
    return newConfig;
  }

  try {
    const started = await launchBITUMD(params, testnet);
    return started;
  } catch (e) {
    logger.log("error", "error launching bitumd: " + e);
  }
};

export const createWallet = (testnet, walletPath) => {
  const newWalletDirectory = getWalletPath(testnet, walletPath);
  try {
    if (!fs.pathExistsSync(newWalletDirectory)){
      fs.mkdirsSync(newWalletDirectory);

      // create new configs for new wallet
      initWalletCfg(testnet, walletPath);
      newWalletConfigCreation(testnet, walletPath);
    }
    return true;
  } catch (e) {
    logger.log("error", "error creating wallet: " + e);
    return false;
  }
};

export const removeWallet = (testnet, walletPath) => {
  let removeWalletDirectory = getWalletPath(testnet, walletPath);
  try {
    if (fs.pathExistsSync(removeWalletDirectory)) {
      fs.removeSync(removeWalletDirectory);
    }
    return true;
  } catch (e) {
    logger.log("error", "error creating wallet: " + e);
    return false;
  }
};

export const startWallet = (mainWindow, daemonIsAdvanced, testnet, walletPath, reactIPC) => {
  if (GetBitumwPID()) {
    logger.log("info", "bitumwallet already started " + GetBitumwPID());
    mainWindow.webContents.send("bitumwallet-port", GetBitumwPort());
    return GetBitumwPID();
  }
  initWalletCfg(testnet, walletPath);
  try {
    return launchBITUMWallet(mainWindow, daemonIsAdvanced, walletPath, testnet, reactIPC);
  } catch (e) {
    logger.log("error", "error launching bitumwallet: " + e);
  }
};

export const stopDaemon = () => {
  return closeBITUMD(GetBitumdPID());
};

export const stopWallet = () => {
  return closeBITUMW(GetBitumwPID());
};

export const setWatchingOnlyWallet = (isWatchingOnly) => {
  watchingOnlyWallet = isWatchingOnly;
};

export const getWatchingOnlyWallet = () => watchingOnlyWallet;
