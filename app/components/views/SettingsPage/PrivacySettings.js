import { FormattedMessage as T } from "react-intl";
import {
  EXTERNALREQUEST_NETWORK_STATUS, EXTERNALREQUEST_STAKEPOOL_LISTING,
  EXTERNALREQUEST_UPDATE_CHECK,
  EXTERNALREQUEST_POLITEIA,
  EXTERNALREQUEST_BITUMDATA,
} from "main_dev/externalRequests";

const AllowableRequestType = ({ id, label, description, checked, onChange }) => (
  <div className="settings-row settings-row-checklist">
    <div className="settings-label">
      {label}
    </div>
    <div className="privacy-checkbox">
      <input id={id} type="checkbox" checked={checked} onChange={onChange}/>
      <label htmlFor={id}></label>
    </div>
    <div className="settings-checklist-description">
      {description}
    </div>
  </div>
);

const PrivacySettings = ({
  tempSettings,
  onChangeTempSettings
}) => {
  const toggle = (value) => () => {
    const allowedExternalRequests = [ ...tempSettings.allowedExternalRequests ];
    const idx = allowedExternalRequests.indexOf(value);
    if (idx > -1) {
      allowedExternalRequests.splice(idx, 1);
    } else {
      allowedExternalRequests.push(value);
    }
    onChangeTempSettings({ allowedExternalRequests });
  };

  return (
    <div className="settings-privacy">
      <div className="settings-column-title"><T id="settings.privacy.title" m="Privacy" /></div>
      <div className="settings-column-content">
        <AllowableRequestType
          label={<T id="settings.privacy.networkStatus.label" m="Network Information" />}
          id="networking"
          description={<T id="settings.privacy.networkStatus.description" m="General network information (block height, etc) from bitum.io" />}
          checked={tempSettings.allowedExternalRequests.indexOf(EXTERNALREQUEST_NETWORK_STATUS) > -1}
          onChange={toggle(EXTERNALREQUEST_NETWORK_STATUS)}
        />
        <AllowableRequestType
          label={<T id="settings.privacy.stakepoolListing.label" m="Stakepool Listing" />}
          id="stakepool"
          description={<T id="settings.privacy.stakepoolListing.description" m="List of currently available stakepools from bitum.io" />}
          checked={tempSettings.allowedExternalRequests.indexOf(EXTERNALREQUEST_STAKEPOOL_LISTING) > -1}
          onChange={toggle(EXTERNALREQUEST_STAKEPOOL_LISTING)}
        />
        <AllowableRequestType
          label={<T id="settings.privacy.updateCheck.label" m="Update Check" />}
          id="update"
          description={<T id="settings.privacy.updateCheck.description" m="Get latest released version from github.org" />}
          checked={tempSettings.allowedExternalRequests.indexOf(EXTERNALREQUEST_UPDATE_CHECK) > -1}
          onChange={toggle(EXTERNALREQUEST_UPDATE_CHECK)}
        />
        <AllowableRequestType
          label={<T id="settings.privacy.politeia.label" m="Politeia" />}
          id="politeia"
          description={<T id="settings.privacy.politeia.description" m="List and vote on proposals on proposals.bitum.io" />}
          checked={tempSettings.allowedExternalRequests.indexOf(EXTERNALREQUEST_POLITEIA) > -1}
          onChange={toggle(EXTERNALREQUEST_POLITEIA)}
        />
        <AllowableRequestType
          label={<T id="settings.privacy.bitumdata.label" m="Bitum Block Explorer" />}
          id="bitumdata"
          description={<T id="settings.privacy.bitumdata.description" m="Access chain information from explorer.bitum.io" />}
          checked={tempSettings.allowedExternalRequests.indexOf(EXTERNALREQUEST_BITUMDATA) > -1}
          onChange={toggle(EXTERNALREQUEST_BITUMDATA)}
        />
      </div>
    </div>
  );
};

export default PrivacySettings;
