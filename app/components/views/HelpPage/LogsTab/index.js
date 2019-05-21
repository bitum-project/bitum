import Logs from "./Page";
import { getBitumdLogs, getBitumwalletLogs, getBitumLogs } from "wallet";
import { logging } from "connectors";
import { DescriptionHeader } from "layout";
import { FormattedMessage as T } from "react-intl";
import ReactTimeout from "react-timeout";

export const LogsTabHeader = () =>
  <DescriptionHeader
    description={<T id="help.description.logs" m="Please find your current logs below to look for any issue or error you are having." />}
  />;
@autobind
class LogsTabBody extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.getLogs();
  }

  componentDidUpdate() {
    if(this.state.interval) {
      return;
    }
    const interval = this.props.setInterval(() => {
      this.getLogs();
    }, 2000);
    this.setState({ interval });
  }

  componentWillUnmount() {
    this.props.clearInterval(this.state.interval);
  }

  getInitialState() {
    return {
      interval: null,
      bitumdLogs: "",
      bitumwalletLogs: "",
      bitumLogs: "",
      showBitumdLogs: false,
      showBitumwalletLogs: false,
      showBitumLogs: false
    };
  }

  render() {
    const { onShowBitumLogs, onShowBitumdLogs, onShowBitumwalletLogs,
      onHideBitumLogs, onHideBitumdLogs, onHideBitumwalletLogs
    } = this;
    return (
      <Logs
        {...{
          ...this.props,
          ...this.state,
          onShowBitumLogs,
          onShowBitumdLogs,
          onShowBitumwalletLogs,
          onHideBitumLogs,
          onHideBitumdLogs,
          onHideBitumwalletLogs,
        }}
      />
    );
  }

  getLogs() {
    return Promise
      .all([ getBitumdLogs(), getBitumwalletLogs(), getBitumLogs() ])
      .then(([ rawBitumdLogs, rawBitumwalletLogs, bitumLogs ]) => {
        const bitumdLogs = Buffer.from(rawBitumdLogs).toString("utf8");
        const bitumwalletLogs = Buffer.from(rawBitumwalletLogs).toString("utf8");
        if ( bitumdLogs !== this.state.bitumdLogs ) {
          this.setState({ bitumdLogs });
        }
        if ( bitumwalletLogs !== this.state.bitumwalletLogs ) {
          this.setState({ bitumwalletLogs });
        }
        if ( bitumLogs !== this.state.bitumLogs ) {
          this.setState({ bitumLogs });
        }
      });
  }

  onShowBitumLogs() {
    this.setState({ showBitumLogs: true });
  }

  onHideBitumLogs() {
    this.setState({ showBitumLogs: false });
  }

  onShowBitumdLogs() {
    this.setState({ showBitumdLogs: true });
  }

  onHideBitumdLogs() {
    this.setState({ showBitumdLogs: false });
  }

  onShowBitumwalletLogs() {
    this.setState({ showBitumwalletLogs: true });
  }

  onHideBitumwalletLogs() {
    this.setState({ showBitumwalletLogs: false });
  }
}

export const LogsTab = ReactTimeout(logging(LogsTabBody));
