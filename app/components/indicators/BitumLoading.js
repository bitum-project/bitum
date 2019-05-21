import "style/Loading.less";

const BitumLoading = ({ hidden }) => (
  <div
    className={"new-logo-animation"}
    style={{ display: hidden ? "none" : "block" }}/>
);

export default BitumLoading;
