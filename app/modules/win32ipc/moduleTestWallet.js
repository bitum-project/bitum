// Sample script to test the namedpiperx option of bitumwallet in windows.
// Requires that a wallet config exists in the default bitum config dir,
// with a wallet name "default-wallet".

const childProcess = require("child_process");
const addon = require("./build/Release/win32ipc");
const path = require("path");
const os = require("os");

//const pipeFname = "\\\\.\\pipe\\bitumwallet-test";
const walletConfPath = path.join(os.homedir(), "AppData", "Local", "Bitum",
  "wallets", "testnet", "default-wallet", "bitumwallet.conf");

function sleep(milli) {
  return new Promise(resolve => setTimeout(resolve, milli));
}

async function test() {
  try {
    const pipe = addon.createPipe("out");
    childProcess.spawn("bitumwallet", [
      `-C ${walletConfPath}`,
      `--piperx ${pipe.readEnd}`, "--debuglevel BITUMW=TRACE"
    ], { "detached": true, "shell": true });

    console.log(pipe);
    await sleep(7000);
    console.log("Slept to test some. Will try to close the pipe.");
    console.log(addon.closePipe(pipe));
    console.log("Closed the pipe!");
  } catch (error) {
    console.log("Error");
    console.log(error);
    return;
  }
}

setTimeout(test, 3000);

setTimeout(function () { process.exit(0); }, 15000);
