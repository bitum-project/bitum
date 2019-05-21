import ExternalLink from "./ExternalLink";

export default ({ children, path }) => (
  <ExternalLink
    href={"https://proposals.bitum.io" + (path||"")}
    hrefTestNet={"https://test-proposals.bitum.io" + (path||"")}
  >
    {children}
  </ExternalLink>
);
