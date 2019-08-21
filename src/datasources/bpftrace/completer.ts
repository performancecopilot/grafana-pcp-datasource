import { PCPBPFtraceDatasource } from "./datasource";

export default class PCPBPFtraceCompleter {

    identifierRegexps = [/[a-zA-Z0-9_\-:.]/];
    probeCache: Record<string, string[]> = {};

    constructor(private datasource: PCPBPFtraceDatasource, private target: any) {
    }

    getCompletions(editor: any, session: any, pos: any, prefix: any, callback: any) {
        this.findCompletions(editor, session, pos, prefix).then((value) => {
            callback(null, value);
        }, (reason: any) => {
            callback(reason, []);
        });
    }

    getCompletion(word: string, meta: string) {
        return {
            caption: word,
            value: word,
            meta: meta,
            score: Number.MAX_VALUE
        };
    }

    *getAllPreviousTokens(session: any, pos: any) {
        const curLineTokens = session.getTokens(pos.row);
        const curLineTokensUntilCursor: any[] = [];
        // get all tokens of the current line until cursor position
        for (let i = 0, c = 0; i < curLineTokens.length; i++) {
            c += curLineTokens[i].value.length;
            if (c > pos.column) {
                break;
            }
            curLineTokensUntilCursor.push(curLineTokens[i]);
        }
        curLineTokensUntilCursor.reverse();
        yield* curLineTokensUntilCursor;

        for (let row = pos.row - 1; row >= 0; row--) {
            const tokens = session.getTokens(row);
            for (let i = tokens.length - 1; i >= 0; i--) {
                yield tokens[i];
            }
        }
    }

    async findProbeCompletions() {
        // don't do this in constructor of PCPBPFtraceCompleter, as the user could
        // change the endpoint settings of the query, but the constructor is only called once
        const [url, container] = this.datasource.getConnectionParams(this.target, {});
        const endpoint = this.datasource.getOrCreateEndpoint(url, container);

        if (!this.probeCache[endpoint.id]) {
            const result = await endpoint.pmapiSrv.getMetricValues(["bpftrace.info.tracepoints"]);
            const indoms = await endpoint.pmapiSrv.getIndoms("bpftrace.info.tracepoints");
            this.probeCache[endpoint.id] = result.values[0].instances.map(instance => {
                const indom = indoms[instance.instance || ""];
                return indom ? indom.name : "";
            });
            this.probeCache[endpoint.id].unshift("END");
            this.probeCache[endpoint.id].unshift("BEGIN");
        }
        return this.probeCache[endpoint.id].map(probe => this.getCompletion(probe, "probe"));
    }

    async findCompletions(editor: any, session: any, pos: any, prefix: any) {
        const token = session.getTokenAt(pos.row, pos.column);
        if (token.type === "keyword.control.probe") {
            return this.findProbeCompletions();
        }
        else {
            return [];
        }
    }
}
