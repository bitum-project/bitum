// @flow
import { Link } from "react-router-dom";
import { Balance, Tooltip } from "shared";
import { ProgressRing } from "indicators";
import { FormattedMessage as T, injectIntl, defineMessages } from "react-intl";
import { TRANSACTION_DIR_SENT, TRANSACTION_DIR_RECEIVED,
  TRANSACTION_DIR_TRANSFERRED
} from "wallet/service";
import "style/Header.less";

const messages = defineMessages({
  //same as the types used in index.js
  Ticket: {
    id: "notifications.type.ticket",
    defaultMessage: "Ticket"
  },
  Vote: {
    id: "notifications.type.vote",
    defaultMessage: "Voted"
  },
  Revocation: {
    id: "notifications.type.revocation",
    defaultMessage: "Revoked"
  },
  [TRANSACTION_DIR_SENT]: {
    id: "notifications.type.send",
    defaultMessage: "Sent"
  },
  [TRANSACTION_DIR_TRANSFERRED]: {
    id: "notifications.type.transfer",
    defaultMessage: "Transferred"
  },
  [TRANSACTION_DIR_RECEIVED]: {
    id: "notifications.type.receive",
    defaultMessage: "Received"
  }
});

const Transaction = ({
  type,
  message,
  onDismissMessage,
  intl,
  topNotification,
  progress
}) => ("");

export default injectIntl(Transaction);
