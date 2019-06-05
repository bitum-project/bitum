import Page from "./Heatmap";
import { myTicketsCharts } from "connectors";
import { BitumLoading } from "indicators";

@autobind
class Heatmap extends React.Component{
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.getTicketsHeatmapStats();
  }

  render() {
    const { ticketDataHeatmap } = this.props;
    return ticketDataHeatmap.length > 0 ? <Page {...{ data: this.props.ticketDataHeatmap }}/> : <BitumLoading />;
  }
}

export default myTicketsCharts(Heatmap);
