import { FormattedMessage as T } from "react-intl";
import "style/Logs.less";

const Logs = ({
  showBitumdLogs,
  showBitumwalletLogs,
  onShowBitumdLogs,
  onShowBitumwalletLogs,
  onHideBitumdLogs,
  onHideBitumwalletLogs,
  bitumdLogs,
  bitumwalletLogs,
  isDaemonRemote,
  isDaemonStarted,
  walletReady,
  bitumLogs,
  showBitumLogs,
  onShowBitumLogs,
  onHideBitumLogs,
}
) => (
  <>
    <div className="tabbed-page-subtitle"><T id="logs.subtitle" m="System Logs"/></div>
    {!isDaemonRemote && isDaemonStarted ?
      !showBitumdLogs ?
        <div className="log-area hidden">
          <div className="log-area-title hidden" onClick={onShowBitumdLogs}>
            <T id="help.logs.bitumd" m="bitumd" />
          </div>
        </div>:
        <div className="log-area expanded">
          <div className="log-area-title expanded" onClick={onHideBitumdLogs}>
            <T id="help.logs.bitumd" m="bitumd" />
          </div>
          <div className="log-area-logs">
            <textarea rows="30" value={bitumdLogs} disabled />
          </div>
        </div> :
      <div/>
    }
    {!walletReady ? null : !showBitumwalletLogs ?
      <div className="log-area hidden">
        <div className="log-area-title hidden" onClick={onShowBitumwalletLogs}>
          <T id="help.logs.bitumwallet" m="bitumwallet" />
        </div>
      </div>:
      <div className="log-area expanded">
        <div className="log-area-title expanded" onClick={onHideBitumwalletLogs}>
          <T id="help.logs.bitumwallet" m="bitumwallet" />
        </div>
        <div className="log-area-logs">
          <textarea rows="30" value={bitumwalletLogs} disabled />
        </div>
      </div>
    }
    {!showBitumLogs ?
      <div className="log-area hidden">
        <div className="log-area-title hidden" onClick={onShowBitumLogs}>
          <T id="help.logs.bitum" m="bitum" />
        </div>
      </div>:
      <div className="log-area expanded">
        <div className="log-area-title expanded" onClick={onHideBitumLogs}>
          <T id="help.logs.bitum" m="bitum" />
        </div>
        <div className="log-area-logs">
          <textarea rows="30" value={bitumLogs} disabled />
        </div>
      </div>
    }
  </>
);

export default Logs;
