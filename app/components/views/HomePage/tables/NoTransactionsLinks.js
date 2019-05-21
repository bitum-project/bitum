import { Link } from "react-router-dom";
import { FormattedMessage as T } from "react-intl";
import { ExternalLink } from "shared";

export default () => (
  <div className="overview-no-transactions">
    <Link to="/transactions/receive" className="receive">
      <T id="home.noTransactions.receiveLink" m="Generate a BITUM Address for receiving funds" /> →
    </Link>
    <ExternalLink href="https://bitum.io/exchanges" className="buy">
      <T id="home.noTransactions.buyFromExchanges" m="Buy Bitum from Exchanges" /> →
    </ExternalLink>
  </div>
);
