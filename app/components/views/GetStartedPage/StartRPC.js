import { KeyBlueButton } from "buttons";
import { ShowError } from "shared";
import { FormattedMessage as T } from "react-intl";
import { getBitumdLastLogLine, getBitumwalletLastLogLine } from "wallet";
import ReactTimeout from "react-timeout";
import "style/GetStarted.less";

function parseLogLine(line) {
  const res = /^[\d :\-.]+ \[...\] (.+)$/.exec(line);
  return res ? res[1] : "";
}

const LastLogLinesFragment = ({ lastBitumdLogLine, lastBitumwalletLogLine }) => (
  <div className="get-started-last-log-lines">
    <div className="last-bitumd-log-line">{lastBitumdLogLine}</div>
    <div className="last-bitumwallet-log-line">{lastBitumwalletLogLine}</div>
  </div>
);

const StartupErrorFragment = ({ onRetryStartRPC }) => (
  <div className="advanced-page-form">
    <div className="advanced-daemon-row">
      <ShowError className="get-started-error" error="Connection to bitumd failed, please try and reconnect." />
    </div>
    <div className="loader-bar-buttons">
      <KeyBlueButton className="get-started-rpc-retry-button" onClick={onRetryStartRPC}>
        <T id="getStarted.retryBtn" m="Retry" />
      </KeyBlueButton>
    </div>
  </div>
);

@autobind
class StartRPCBody extends React.Component {

  constructor(props) {
    super(props);
    this.state = { lastBitumdLogLine: "", lastBitumwalletLogLine: "" };
  }

  componentDidMount() {
    this.props.setInterval(() => {
      Promise
        .all([ getBitumdLastLogLine(), getBitumwalletLastLogLine() ])
        .then(([ bitumdLine, bitumwalletLine ]) => {
          const lastBitumdLogLine = parseLogLine(bitumdLine);
          const lastBitumwalletLogLine = parseLogLine(bitumwalletLine);
          if ( lastBitumdLogLine !== this.state.lastBitumdLogLine ||
              lastBitumwalletLogLine !== this.state.lastBitumwalletLogLine)
          {
            this.setState({ lastBitumdLogLine, lastBitumwalletLogLine });
          }
        });
    }, 2000);
  }

  render () {
    const { startupError, getCurrentBlockCount } = this.props;

    return (
      <Aux>
        {!getCurrentBlockCount && <LastLogLinesFragment {...this.state} />}
        {startupError && <StartupErrorFragment {...this.props} />}
      </Aux>
    );
  }
}

export default ReactTimeout(StartRPCBody);
