// @flow
import axios from "axios";

export const BITUMDATA_URL_TESTNET = "https://testnet.bitum.io/api";
export const BITUMDATA_URL_MAINNET = "https://explorer.bitum.io/api";

const GET = (path) => {
  return axios.get(path);
};

export const getTreasuryInfo = (daURL, treasuryAddress) => GET(daURL + "/address/" + treasuryAddress + "/totals");
