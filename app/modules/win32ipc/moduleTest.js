const childProcess = require("child_process");
const util = require("util");
const addon = require("./build/Release/win32ipc");

var pipe = addon.createPipe("out");
console.log(pipe.readEnd, pipe.writeEnd);

childProcess.spawn("bitumd", [ "--testnet", util.format("--piperx=%d", pipe.readEnd) ],
  { "detached": true, "shell": true });

setTimeout(function () { process.exit(0); }, 10000);
