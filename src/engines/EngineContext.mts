import {
  DatapointSequence,
  DatapointState,
  SequenceState,
  UniqueDatapoint,
} from "jm-castle-ac-dc-types";

export type ContextDatapoints = Record<
  string,
  { point: UniqueDatapoint; state: DatapointState }
>;

export type ContextSequences = Record<
  string,
  { sequence: DatapointSequence; state: SequenceState }
>;

export class EngineContext {
  constructor(
    init: {
      datapoints?: ContextDatapoints;
      sequences?: ContextSequences;
    },
    lap: number,
    news?: EngineContext
  ) {
    init.datapoints && Object.assign(this.datapoints, init.datapoints);
    init.sequences && Object.assign(this.sequences, init.sequences);
    this.news = news;
    this.lap = lap;
    return this;
  }

  private datapoints: ContextDatapoints = {};
  private sequences: ContextSequences = {};
  private news?: EngineContext;
  private lap: number;

  public getLap = () => this.lap;
  public setLap = (lap: number) => (this.lap = lap);

  public copyWithNews = (news: EngineContext) => {
    return new EngineContext(
      {
        datapoints: this.datapoints,
        sequences: this.sequences,
      },
      this.lap,
      news
    );
  };

  public copy = () => {
    return new EngineContext(
      {
        datapoints: this.datapoints,
        sequences: this.sequences,
      },
      this.lap,
      this.news
    );
  };

  public hasAnyData = () => {
    return (
      !!Object.keys(this.datapoints).length ||
      !!Object.keys(this.sequences).length
    );
  };

  public getNews = () => this.news;

  public mergeUpdates = (context: EngineContext) => {
    Object.entries(context.datapoints).forEach(([k, data]) => {
      const { point, state } = data;
      this.setDatapoint(point, state);
    });
    Object.entries(context.sequences).forEach(([k, data]) => {
      const { sequence, state } = data;
      this.setSequence(sequence, state);
    });
  };

  public setDatapoint = (point: UniqueDatapoint, state: DatapointState) => {
    this.datapoints[state.id] = { point, state };
  };

  public getDatapoint = (id: string) => {
    return this.datapoints[id];
  };

  public resetDatapoints = () => {
    const datapoints = { ...this.datapoints };
    this.datapoints = {};
    return datapoints;
  };

  public resetSequences = () => {
    const sequences = { ...this.sequences };
    this.sequences = {};
    return sequences;
  };

  public setSequence = (sequence: DatapointSequence, state: SequenceState) => {
    this.sequences[sequence.id] = { sequence, state };
  };

  public getSequence = (id: string) => {
    return this.sequences[id];
  };
}
