import { FormattedMessage as T, injectIntl, defineMessages } from "react-intl";
import { TextInput } from "inputs";

const messages = defineMessages({
  addressFieldPlaceholder: {
    id: "securitycenter.validate.field.address.placeholder",
    defaultMessage: "Enter an address to validate",
  },
});

const ValidateAddressForm = ({
  onAddressChange,
  result,
  address,
  intl
}) => (
  <>
    <div className="tabbed-page-subtitle"><T id="security.validate.title" m="Validate Addresses"/></div>
    <div className="validate-address-form">
      <div className="validate-address-form-label">
        <T id="securitycenter.validate.field.address.label" m="Address"/>
      </div>
      <div className="validate-address-form-address">
        <TextInput
          value={address}
          placeholder={intl.formatMessage(messages.addressFieldPlaceholder)}
          onChange={(e) => onAddressChange(e.target.value)}
        />
      </div>
      {result && address !== "" ?
        <>{ result }</> :
        <div/>
      }
    </div>
  </>
);

export default injectIntl(ValidateAddressForm);
