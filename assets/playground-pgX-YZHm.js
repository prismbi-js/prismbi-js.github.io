import{m as K,v as Ce,r as ke,b as ee,p as q,d as we}from"./index-D64wgeun.js";import{a as Ne}from"./ai-Bi_pzjh7.js";import{b as De}from"./model-BE1WJt-w.js";const Ie=`# Advanced modeling

These features build on [data modeling](data-model.md): relationship options, calculated tables, calculation groups, parameters, hierarchies, perspectives and row-level security.

## Relationship options

\`\`\`ts
model.addRelationship({
  from: 'Sales[ProductId]',      // many side
  to: 'Products[Id]',            // one side
  crossFilter: 'both',           // 'single' (default): to → from only; 'both': also from → to
  active: true,                  // inactive relationships only filter inside USERELATIONSHIP
  cardinality: 'manyToOne',      // or 'manyToMany' (duplicates allowed on \`to\`, no RELATED across it)
});
\`\`\`

| Need | Use |
|---|---|
| A dimension filtered by facts (e.g. "products sold in this region") | \`crossFilter: 'both'\`, or \`CALCULATE(…, CROSSFILTER(Sales[ProductId], Products[Id], BOTH))\` per measure |
| Two dates on one fact (order date, ship date) | One active relationship plus \`active: false\` on the others. Measures use \`CALCULATE([Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]))\` |
| Budgets at a coarser grain (category × year) | \`cardinality: 'manyToMany'\` from \`Budget[Category]\` to \`Products[Category]\` |
| Filtering by a column with no relationship | \`CALCULATE([Sales], TREATAS(VALUES(Targets[Region]), Region[Name]))\` |

With bidirectional filtering, a dimension is narrowed by filters coming from the other side of the fact (other dimensions, or the fact's own columns). A filter on a dimension's own columns does not narrow it to "only members with facts", which matches Power BI.

## Calculated tables and table queries

\`\`\`ts
model.addCalculatedTable('Category Sales', 'SUMMARIZECOLUMNS(Products[Category], "Sales", [Total Sales])');
model.evaluateTable('TOPN(5, ADDCOLUMNS(VALUES(Products[Name]), "S", [Total Sales]), [S])');
// → { columns: ['Name', 'S'], rows: [['Road Bike', 3000], …] }
model.recalculateTables(); // after changing data (refreshTable does this for you)
\`\`\`

Table functions: \`SUMMARIZE\`, \`SUMMARIZECOLUMNS\`, \`ADDCOLUMNS\`, \`SELECTCOLUMNS\`, \`CROSSJOIN\`, \`UNION\`, \`INTERSECT\`, \`EXCEPT\`, \`GENERATE\`, \`ROW\`, \`DATATABLE\`, \`GENERATESERIES\`, \`CALENDAR\`, \`TREATAS\`, plus \`FILTER\`, \`VALUES\`, \`ALL\` and \`TOPN\`.

## Calculation groups

A calculation group rewrites whatever measure is evaluated while one of its items is selected (by a slicer, a filter, or because the visual groups by it). One group replaces dozens of near-identical measures.

![The demo modeling page: calculation groups, field parameters and what-if parameters](../images/report-modeling.png)

\`\`\`ts
model.addCalculationGroup({
  name: 'Time Calc',
  column: 'Calculation',                     // default "Name"
  precedence: 10,                            // higher applies first when groups combine
  items: [
    { name: 'Current',    expression: 'SELECTEDMEASURE()' },
    { name: 'Prior year', expression: 'CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date]))' },
    { name: 'YTD',        expression: 'TOTALYTD(SELECTEDMEASURE(), Date[Date])' },
    { name: 'YoY %',      expression: 'VAR py = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date])) RETURN FORMAT(DIVIDE(SELECTEDMEASURE() - py, py), "+0.0%")' },
  ],
});
\`\`\`

\`\`\`ts
{ type: 'matrix', fields: { rows: 'Products[Category]', columns: "'Time Calc'[Calculation]", values: 'Total Sales' } }
{ type: 'slicer', fields: { field: "'Time Calc'[Calculation]" }, format: { slicer: { style: 'tiles', single: true } } }
\`\`\`

Inside items you can use \`SELECTEDMEASURE()\`, \`SELECTEDMEASURENAME()\` and \`ISSELECTEDMEASURE([A], [B])\`. With no item selected (or several), measures evaluate normally. Values keep the measure's format. To give an item its own format, return text with \`FORMAT()\`, as the YoY % item does.

## Field parameters

A field parameter lets report users pick which measure or column a visual shows:

\`\`\`ts
model.addFieldParameter('Metric', [
  { label: 'Sales',  field: 'Total Sales' },
  { label: 'Profit', field: 'Total Profit' },
  { label: 'Region', field: 'Region[Name]' },
]);
\`\`\`

\`\`\`ts
{ type: 'slicer', fields: { field: 'Metric[Metric]' }, format: { slicer: { style: 'tiles', single: true } } }
{ type: 'clusteredColumn', fields: { category: 'Products[Category]', values: 'Metric[Metric]' } }
\`\`\`

Every field well expands \`Metric[Metric]\` to the selected fields, or to all of them when nothing is selected. In code: \`model.resolveFieldParameter('Metric[Metric]', filters)\`.

## What-if parameters

\`\`\`ts
model.addWhatIfParameter('Price Change', { min: -0.2, max: 0.2, step: 0.05, default: 0, format: '0%' });
// creates table 'Price Change' and measure [Price Change Value]
model.addMeasure('Projected Sales', '[Total Sales] * (1 + [Price Change Value])');
\`\`\`

\`\`\`ts
{ type: 'slicer', fields: { field: "'Price Change'[Price Change]" }, format: { slicer: { style: 'slider' } } }
\`\`\`

## Hierarchies, display folders, perspectives

\`\`\`ts
model.addHierarchy('Date', 'Calendar', ['Year', 'Quarter', 'Month']);
// any drillable well: { category: 'Date[Calendar]' }; a slicer on it becomes a tree

model.addTable('Sales', rows, { Amount: { folder: 'Money' } });
model.addMeasure('Total Sales', 'SUM(Sales[Amount])', { folder: 'KPIs' });

model.addPerspective('Sales analysis', ['Sales', 'Products', 'Total Sales']);
model.fields({ perspective: 'Sales analysis' });  // only those tables / fields
\`\`\`

## Row-level security

\`\`\`ts
model
  .addRole('Europe', { Region: 'Region[Group] = "Europe"' })
  .addRole('Region manager', { Region: 'Region[Manager] = USERNAME()' });

model.setRoles(['Region manager'], { user: 'alice@contoso.com' });
model.setRoles(null); // remove security
\`\`\`

- A rule is a DAX boolean evaluated once per row of its table. Allowed rows flow through relationships like any filter, so restricting \`Region\` restricts \`Sales\`.
- With several active roles, each table keeps the rows any of them allow. Restrictions on different tables combine.
- Security is applied below the filter context, so \`ALL()\`, \`REMOVEFILTERS()\` and \`ALLSELECTED()\` can't remove it. Slicer domains, filter pane lists, totals and exports all respect it.
- \`USERNAME()\`, \`USERPRINCIPALNAME()\` and \`CUSTOMDATA()\` return what you pass to \`setRoles\`.

> Row-level security in the browser decides **what the report shows**, not what the user can download. Every row you send to the client can be read there. For real data protection, filter on the server before sending data, and use the same role definitions to describe the rules.

## Try it

Row-level security: the same measure, as seen by a role:

\`\`\`js playground
model.addRole('Europe', { Region: 'Region[Group] = "Europe"' });
const everyone = model.evaluate('[Total Sales]');
model.setRoles(['Europe']);
return { everyone, europeOnly: model.evaluate('[Total Sales]') };
\`\`\`

On the docs site (\`npm run docs\`), **▶ Run in playground** opens it in an editor next to its output.
`,xe=`# AI: questions, explanations, insights and agents

\`@prismbi/prismbi/ai\` adds four things. Everything runs offline on the model by default, with no API keys or network calls:

- **Ask:** a plain-language question becomes a visual.
- **Explain:** why a value is what it is.
- **Insights:** what's unusual in the data.
- **Agents:** context and tools for AI agent frameworks.

Language models are optional, plugged in through a function you provide.

\`\`\`ts
import '@prismbi/prismbi/ai'; // registers the \`qna\` and \`insights\` visuals and "Explain this" on right-click
import { ask, explain, findInsights, getAIContext, createAgentTools } from '@prismbi/prismbi/ai';
\`\`\`

## Ask

\`\`\`ts
const { spec, interpretation, unmatched, confidence } = askSync(model, 'top 5 products by profit in 2025');
// spec → { type: 'clusteredBar', fields: { category: 'Product[Name]', values: ['Total Profit'] }, top: 5, sort: …, filters: [Year = 2025] }
report.addVisual({ ...spec, layout: { x: 0, y: 0, w: 6, h: 7 } });
\`\`\`

The parser builds its vocabulary from the model: measure names (with "Total Sales" also answering to "sales"), table and column names, and the values of short text columns. It understands:

| You say | It does |
|---|---|
| \`by category\`, \`per region\`, \`for each channel\` | groups by the column (a table name picks its label column) |
| \`in Canada\`, \`bikes and clothing\` | filters on the column holding those values |
| \`2025\`, \`last year\`, \`this year\`, \`last quarter\`, \`last 6 months\`, \`ytd\` | date filters relative to the latest date with data |
| \`top 5\`, \`bottom 3\`, \`highest\`, \`lowest\` | Top N and sort direction |
| \`average price\`, \`max quantity\`, \`how many orders\`, \`distinct customers\` | implicit aggregations |
| \`trend\`, \`share\`, \`as a table\`, \`matrix\`, \`scatter\`, \`as bars\` | the visual type |

Without a hint it picks a sensible chart:

| Question shape | Chart |
|---|---|
| No grouping | A card |
| Grouped by time | A line, by year-month unless a single year is selected |
| Few categories | Columns |
| Many categories or a Top N | Bars |
| Two groupings | A clustered or matrix layout |

\`unmatched\` lists words it didn't understand. \`confidence\` is the share of the question it did.

- **Synonyms:** \`askSync(model, q, { synonyms: { 'Total Sales': ['revenue', 'turnover'] } })\`.
- **Language model:** \`await ask(model, q, { llm })\` calls \`llm(prompt)\` with the schema and the question. It expects a JSON plan back. Plans that reference unknown fields fall back to the rules (\`source\` says which was used). \`llmPrompt(model, q)\` shows the exact prompt.

\`\`\`ts
const llm = async (prompt: string) => (await fetch('/api/llm', { method: 'POST', body: prompt })).text();
const answer = await ask(model, 'how did margins move in Europe vs last year?', { llm });
\`\`\`

### The Q&A visual


![The Q&A visual answering a typed question with a chart](../images/qna.png)
\`\`\`ts
{ type: 'qna', title: 'Ask a question', layout: { x: 0, y: 0, w: 7, h: 9 }, fields: {},
  format: { qna: { synonyms: { 'Total Sales': ['revenue'] }, suggestions: ['sales by month'] } } }
\`\`\`

- **Answers:** a nested visual, filtered by the page's slicers and filters.
- **Chips:** show how the question was understood.
- **Empty box:** suggested questions generated from the model.

## Explain

\`\`\`ts
const x = explain(model, { measure: 'Total Sales', filters: [{ target: 'Date[Year]', op: 'eq', value: 2025 }] });
x.summary; // "Total Sales rose 3.1% to $9.34M from $9.07M in 2024. Biggest contributors: Category Bikes (+$138K, …)"
x.drivers; // [{ column: 'Product[Category]', value: 'Bikes', current, baseline, delta, share }, …]
\`\`\`

- **Change mode:** when the filters contain a period (a year, a date range, a day), the value is compared with the period before. Members of each dimension are ranked by their contribution to the change.
- **Composition mode:** otherwise, it says which members make up the value.
- **Dimensions:** text columns of tables wired into the model. Calculation groups and parameter tables are skipped. Pass \`dimensions\` to choose them.

Right-clicking any data point offers **Explain this** once \`@prismbi/prismbi/ai\` is imported (\`enableExplain(false)\` turns it off). Its panel shows the summary, the top drivers and a chart.

## Insights


![The insights visual listing anomalies, movers and outliers](../images/insights.png)
\`\`\`ts
findInsights(model, { measure: 'Total Sales', filters, max: 6 });
// [{ kind: 'outlier', title: 'Road Bikes stands out among Subcategory values', detail: '$2.7M against a typical $124K.', score, spec }, …]
\`\`\`

| Kind | Finds |
|---|---|
| \`anomaly\` | periods far from a rolling median (robust z-score ≥ 3.5) |
| \`trend\` | the latest periods against the ones before (±5% or more) |
| \`mover\` | the member that drove most of the change in the latest period |
| \`concentration\` | one member holding 40% or more of the total |
| \`outlier\` | members far from the rest of their dimension |

The \`insights\` visual (\`fields: { values: 'Total Sales' }\`, optional \`dimensions\`) lists them for the current filters. Clicking one shows its chart.

### Anomaly alerts

\`watchAnomalies\` re-runs the insights whenever the model changes (streams, refreshes, appended rows) and reports each new finding once:

\`\`\`ts
const stop = watchAnomalies(model, {
  measure: 'Total Sales',
  filters: [{ target: 'Region[Country]', op: 'eq', value: 'Canada' }],
  kinds: ['anomaly', 'mover'],      // default ['anomaly']: unusual spikes and dips
  debounceMs: 500,
  onAnomaly: ({ insight }) => notify(\`\${insight.title}: \${insight.detail}\`),
});
\`\`\`

What is already unusual when watching starts doesn't alert, unless you set \`alertExisting: true\`. In a report definition, use \`alerts: [{ …, when: { anomaly: true } }]\`. The server's \`watchAlerts\` runs those too (see [Server](server.md)).

## Narrative

The \`narrative\` visual writes a short summary of its measures that updates with filters and selections, like Power BI's smart narrative:

![The narrative visual summarising sales in plain language](../images/narrative.png)

\`\`\`ts
{ type: 'narrative', fields: { values: ['Total Sales', 'Orders'], category: 'Region[Group]' }, format: { narrative: { insights: 1 } } }
// "Total Sales for 2025 is $9.34M, up 3.1% from $9.07M in 2024, mostly from Mountain Bikes (+$138K) and Mountain-200 (+$130K).
//  Orders is 16K (up 8.1% from 2024). North America leads Group with $5.18M (55% of the total); Pacific is lowest at $1.47M. …"
\`\`\`

- **What it covers:**
  - The first measure gets its value, the change from the previous period (when the filters name a year or date range) and the biggest contributors.
  - Other measures (up to three) get their value and change.
  - The optional \`category\` adds a breakdown: the leader and the lowest, or the trend for dates and numbers.
  - \`format.narrative.insights\` (default 2) appends the top \`findInsights\` results.
- **Custom text:** \`format.narrative.text\` sets the wording, e.g. \`'Revenue is {[Total Sales]} across {[Orders]} orders.

{summary}'\`. \`{[Measure]}\` becomes a formatted value, \`{summary}\` the automatic text, and a blank line starts a paragraph.
- **Rewording with a language model:** \`setNarrativeWriter(async (facts) => callYourLLM(facts))\`. The rule-based text shows immediately, and the reworded version replaces it when it arrives. Results are cached per filter state. Set \`format.narrative.llm: false\` to keep a visual rule-based.
- **Outside a visual:** \`writeNarrative(model, { measures, filters, breakdown?, insights?, template? })\` returns \`{ text, sentences }\`. Each sentence is a list of parts, with \`{ value }\` parts for the emphasised numbers and names.

## DAX copilot

Write measures from plain English, and explain existing ones:

![The DAX copilot in the Studio measure editor](../images/studio-dax-copilot.png)

\`\`\`ts
import { writeDax, writeDaxSync, explainDax, daxCopilot } from '@prismbi/prismbi/ai';

writeDaxSync(model, 'sales year to date');
// { expression: 'TOTALYTD([Total Sales], Date[Date])', name: 'Total Sales YTD', value: …, note: 'Understood: …', source: 'rules' }
writeDaxSync(model, 'sales yoy % for bikes');   // VAR Prev = … RETURN DIVIDE(…) inside CALCULATE(…, Product[Category] = "Bikes"), format 0.0%
writeDaxSync(model, 'profit per order');        // DIVIDE([Total Profit], [Orders])
explainDax(model, 'CALCULATE([Orders], ALL(Product), Product[Color] = "Red")');
// "Calculates [Orders], ignoring filters on Product and where Product[Color] is "Red".
[Orders] is the number of distinct Sales[OrderNumber]."
\`\`\`

- **What the rules understand:**
  - The model's measures, numeric columns with an aggregation ("average quantity"), and values as filters ("for bikes in 2025").
  - Ratios: "X per Y", "X divided by Y", "X margin".
  - Time intelligence: YTD, QTD, MTD, last year, year-over-year change and %, running total, and share of total.
- **Validation:** every suggestion is checked by evaluating it, so a broken expression never comes back.
- **With a language model:** \`writeDax(model, text, { llm })\` asks the model for JSON (\`daxPrompt\` builds the prompt from the model context). It validates the answer and retries once with the error. If both attempts fail, it falls back to the rules, and the \`note\` says why.
- **In the Studio:** pass \`copilot: daxCopilot(model, { llm? })\` to \`new Studio(…)\`, or call \`studio.setCopilot(…)\`.
  - The measure editor gains a "Describe it" box with **✦ Write DAX** and **Explain**.
  - The suggestion fills in the expression, name and format.
  - The usual live preview and checks run before saving.

## Agents

Agent frameworks need two things: context about the data, and tools to act on it.

### Context

\`\`\`ts
const ctx = getAIContext(model, { report });   // serialisable JSON
const system = contextToPrompt(ctx);           // compact text for a system prompt
\`\`\`

The context contains:
- **Tables:** row counts and columns, each with type, distinct count, examples or min/max, format and calculated-column DAX.
- **Model:** relationships, and measures with their DAX, format and description.
- **Report state** (with a \`report\`): current page, pages, the visuals on the page with their fields, report and page filters, slicer selections and the cross-filter selection.

### Tools

\`createAgentTools({ model, report })\` returns provider-agnostic tools, each with a JSON-schema input and a \`run\` function:

| Tool | Does |
|---|---|
| \`describe_model\` | schema, relationships, measures |
| \`list_values\` | distinct values of a column (with search), to find exact filter values |
| \`run_query\` | group, aggregate, sort, Top N; formatted and raw values plus totals |
| \`evaluate_dax\` | a scalar expression, or \`EVALUATE <table expression>\` |
| \`ask\` | a question → a visual spec |
| \`explain_value\`, \`find_insights\` | as above |
| \`get_report_state\`, \`go_to_page\` | with a report |
| \`add_page\`, \`add_visual\`, \`remove_visual\`, \`set_filters\` | with a report and writes allowed |
| \`create_measure\` | validated by evaluating it first; writes allowed |

- **Writes:** allowed by default when a report is attached. Set \`allowWrites: false\` for read-only agents.
- **Dates:** may arrive as ISO strings and are revived automatically.
- **Errors:** \`runTool\` returns them as \`{ error }\` so the agent can correct itself.
- **Formats:** convert the tools with \`toAnthropicTools\`, \`toOpenAITools\` or \`toMcpTools\`.

### A Claude agent loop

Run this on your server with the Anthropic SDK:

\`\`\`ts
import Anthropic from '@anthropic-ai/sdk';
import { createAgentTools, getAIContext, contextToPrompt, runTool, toAnthropicTools } from '@prismbi/prismbi/ai';

const client = new Anthropic();
const tools = createAgentTools({ model, report });
const messages: Anthropic.MessageParam[] = [{ role: 'user', content: 'Build a page explaining why 2025 sales grew, by region and product.' }];

for (;;) {
  const res = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4096,
    system: \`You are a BI analyst working in a PrismBI report.\\n\\n\${contextToPrompt(getAIContext(model, { report }))}\`,
    tools: toAnthropicTools(tools),
    messages,
  });
  messages.push({ role: 'assistant', content: res.content });
  if (res.stop_reason !== 'tool_use') break;
  const results = await Promise.all(
    res.content.filter((b) => b.type === 'tool_use').map(async (b) => ({
      type: 'tool_result' as const,
      tool_use_id: b.id,
      content: JSON.stringify(await runTool(tools, b.name, b.input)),
    })),
  );
  messages.push({ role: 'user', content: results });
}
\`\`\`

The same tools work with any orchestrator that accepts JSON-schema tools: OpenAI function calling, LangGraph, the Vercel AI SDK, and your own planner.

### \`runAgent\` and LLM adapters

\`runAgent\` is the same loop without an SDK. It works with any model through a small adapter:

\`\`\`ts
import { runAgent, anthropicLLM, openAILLM, createAgentTools } from '@prismbi/prismbi/ai';

const result = await runAgent({
  llm: anthropicLLM({ url: '/api/llm' }),        // or openAILLM({ url, model }) for OpenAI-compatible servers (Azure, Ollama, vLLM…)
  tools: createAgentTools({ model, report }),
  prompt: 'Build a page explaining Q3 by region and product',
  beforeTool: (call, write) => !write || confirm(\`Run \${call.name}?\`),
  onStep: (step) => console.log(step.call.name, step.result),
});
console.log(result.text);
\`\`\`

- **Keys stay on your server.** Point \`url\` at a proxy that adds the API key. \`apiKey\` also works for local experiments; it sends the browser-access header Anthropic requires.
- **Your own model:** an \`AgentLLM\` is one function, \`({ system, messages, tools, signal }) => { text?, toolCalls? }\`. Messages use a neutral format (\`user\`, \`assistant\` with \`toolCalls\`, and \`tool\` results).
- **Offline:** \`ruleBasedLLM()\` needs no model. It splits the prompt into a page and questions with \`planPrompt\`, then calls \`add_page\`, \`ask\` and \`add_visual\`. It handles "build a page about X: A, B and C"-style requests; anything open-ended needs a real model.
- **Defaults:** \`maxSteps\` defaults to 16 model turns. \`WRITE_TOOLS\` lists the tools that change things. Errors come back to the model as \`{ error }\`.

### The Studio agent panel


![The Studio agent panel building a page from one prompt, with undo per step](../images/studio-agent.png)
\`\`\`ts
import { agentPanel, anthropicLLM } from '@prismbi/prismbi/ai';

const agent = agentPanel(studio, {
  llm: anthropicLLM({ url: '/api/llm' }),  // omit to use the offline rule-based planner
  confirmWrites: false,                    // true: preview every change and wait for Apply / Skip
  suggestions: ['Build a page about bikes: sales by month, top 5 products, sales by country'],
});
\`\`\`

- **Where it lives:** a **✦ Agent** button in the Studio top bar opens a side panel.
- **What it logs:** each tool call is listed with its input and result. Changes have an **Undo** button that restores the report from before that step and drops later steps. The model is told about the undo on its next turn.
- **Undo history:** every change is also a normal Studio undo step, so Ctrl+Z still works.
- **API:** \`agent.run(prompt)\`, \`agent.undoStep(i)\`, \`agent.steps\`, \`open()\`, \`close()\`, \`destroy()\`.

Try it with \`npm run dev\`, then open \`/studio.html\`. Add \`?llm=/api/llm\` to use your own Anthropic-compatible endpoint.

### An MCP server

Expose a model to MCP clients with the official SDK:

\`\`\`ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createAgentTools, runTool, toMcpTools } from '@prismbi/prismbi/ai';

const tools = createAgentTools({ model, allowWrites: false });
const server = new Server({ name: '@prismbi/prismbi', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toMcpTools(tools) }));
server.setRequestHandler(CallToolRequestSchema, async (req) => ({
  content: [{ type: 'text', text: JSON.stringify(await runTool(tools, req.params.name, req.params.arguments)) }],
}));
await server.connect(new StdioServerTransport());
\`\`\`

The model engine has no DOM dependency, so this runs on Node. Load data with \`@prismbi/prismbi/connectors\`.

## Try it

\`\`\`js playground
import { askSync, writeDaxSync, explainDax } from '@prismbi/prismbi/ai';
import { createVisual } from '@prismbi/prismbi';

const answer = askSync(model, 'top 5 products by sales in 2025');
const measure = writeDaxSync(model, 'sales year to date for bikes');
console.log(measure.expression, explainDax(model, measure.expression));
return createVisual(el, { model, ...answer.spec });
\`\`\`

On the docs site (\`npm run docs\`), **▶ Run in playground** opens it in an editor next to its output.
`,Oe=`# Collaboration: co-editing, presence and comments

\`@prismbi/prismbi/collab\` lets several people edit the same report live. It also shows who is looking at what, and supports comments on visuals and data points. Bookmarks are shared too.

\`\`\`ts
import { connectReport, broadcastChannelTransport } from '@prismbi/prismbi/collab';

const session = connectReport(studio.report, broadcastChannelTransport('sales-q3'), { user: 'Ana' });
\`\`\`

Try it: run \`npm run dev\`, then open \`/studio.html?room=demo\` in two tabs (add \`&user=Ana\` to name yourself).

## How it stays consistent

- **Entries:** the report is split into entries: report settings, each page, each visual, each bookmark and each comment.
- **Stamps:** every write carries a stamp (a Lamport counter plus a client id), and the newest stamp wins.
- **Convergence:** peers end up identical whatever order messages arrive in.
- **Ordering:** pages and visuals carry an order, so concurrent inserts merge predictably.
- **Joining:** a newcomer announces itself and adopts the room's report when someone answers. If nobody answers within \`joinTimeoutMs\` (400 ms by default), it is first in the room and seeds the room with its own report.
- **Local edits:** anything that fires \`definitionChanged\` (Studio edits, \`addVisual\`, \`updateVisual\`, filters…) is broadcast as changed entries only.
- **Remote edits:** applied with \`report.load\`, keeping the current page.

Two people changing the *same* visual at the same moment resolve to one of the changes. Different visuals never conflict.

## Transports

| Transport | Use |
|---|---|
| \`broadcastChannelTransport(room)\` | Tabs and windows of the same browser; no server |
| \`webSocketTransport(url)\` | A JSON relay server that forwards each message to the other clients in the room |
| \`memoryHub().connect()\` | Tests and in-page demos |
| Your own \`{ send, subscribe, close? }\` | WebRTC, Ably, Pusher, Liveblocks, Supabase Realtime… |

A minimal WebSocket relay just rebroadcasts. With \`ws\` on Node:

\`\`\`ts
wss.on('connection', (socket) => socket.on('message', (m) => wss.clients.forEach((c) => c !== socket && c.send(String(m)))));
\`\`\`

## Presence

- **Selections:** other users' selected visuals (in edit mode) get an outline in their colour with their name.
- **Peers:** \`session.peers()\` lists who is connected, and \`session.on('peers', …)\` fires when that changes.

## Comments

\`\`\`ts
session.addComment({ visualId: 'cols', text: 'Why is Bikes so high?' });
session.addComment({ visualId: 'cols', text: 'Check Q4', point: identity }); // on a data point
session.comments({ visualId: 'cols' });
session.resolveComment(id);
session.on('comments', render);
\`\`\`

- **Badges:** visuals with open comments show a 💬 badge. Clicking it opens the thread, where you can reply or resolve.
- **Right-click:** data points get **Comment on this point**.
- **Storage:** comments live in the shared document like everything else, so they sync and persist with it.

## Options

\`\`\`ts
connectReport(report, transport, { user: 'Ana', color: '#2a78d6', ui: true, joinTimeoutMs: 400 });
\`\`\`

- **\`ui: false\`:** turns off the built-in outlines and badges, so you can draw your own from \`peers()\` and \`comments()\`.
- **\`session.disconnect()\`:** leaves the room and removes the overlays.
`,$e="# Connectors and live data\n\n`@prismbi/prismbi/connectors` loads data into a `DataModel` and keeps it fresh. It is about 3 KB min+gzip and has no dependencies. Every loader returns plain rows, so you can transform them before calling `addTable`.\n\n```ts\nimport { DataModel } from '@prismbi/prismbi';\nimport { loadCsv, loadRest, scheduleRefresh, streamInto } from '@prismbi/prismbi/connectors';\nimport { periodStart } from '@prismbi/prismbi';\n\nconst model = new DataModel()\n  .addTable('Sales', await loadCsv('/data/sales.csv'))\n  .addTable('Customers', await loadRest('https://api.example.com/customers', { path: 'data', pagination: { type: 'cursor', next: 'meta.next', param: 'after' } }));\n```\n\nAll network loaders accept `headers`, `signal` (an `AbortSignal`) and `fetch` (a custom implementation for tests, proxies or older runtimes). A response that isn't 2xx rejects with the status in the message.\n\n## CSV\n\n```ts\nparseCsv(text, { delimiter?, header = true, dynamicTyping = true, skipEmptyLines = true, maxRows? }): Row[]\nloadCsv(url, options): Promise<Row[]>\n```\n\n- RFC 4180: quoted fields, `\"\"` escapes, delimiters and newlines inside quotes, CRLF or LF, byte-order mark.\n- The delimiter is detected from the first line (`,` `;` tab `|`) unless you pass one.\n- Types are decided per column, not per cell. A column becomes numeric only when every non-empty value is a plain number, so ZIP codes like `02134` stay text. `true`/`false` columns become booleans and empty cells become blank. ISO dates are typed by the table (`DataTable` infers `date` columns).\n- Duplicate or empty headers are made unique (`a`, `a_2`, `Column3`). `header: false` names columns `Column1…n`.\n\n### Google Sheets\n\n```ts\nconst rows = await loadCsv(googleSheetCsvUrl('https://docs.google.com/spreadsheets/d/<id>/edit#gid=42'));\n```\n\n`googleSheetCsvUrl(sheetIdOrUrl, gid?)` builds the CSV export URL. The sheet must be shared \"anyone with the link\" or published to the web.\n\n## JSON and REST\n\n```ts\nloadJson(url, { path? }): Promise<Row[]>\nloadRest(url, { path?, params?, pagination?, maxPages = 1000, maxRows?, map? }): Promise<Row[]>\n```\n\n`path` is a dotted path to the rows in the response (`data.items`, `results.0.rows`). Rows can be an array of objects, an array of arrays whose first row is the header, or column arrays (`{ id: [...], name: [...] }`).\n\n| `pagination.type` | Requests | Stops when |\n|---|---|---|\n| `page` | `?page=1`, `?page=2`, … (`param`, `start`, optional `size` sent as `sizeParam`) | a page is empty, or shorter than `size` |\n| `offset` | `?offset=0&limit=100`, … (`param`, `limitParam`, `limit`) | a page is shorter than `limit` |\n| `cursor` | reads the cursor at `next` in the body and sends it back as `param` | the cursor is empty |\n| `link` | follows a URL at `next` in the body, or the `Link: <…>; rel=\"next\"` header | there is no next link |\n\n`map(record)` renames or flattens fields as rows arrive.\n\n## GraphQL\n\n```ts\nconst orders = await loadGraphQL('/graphql', 'query ($n: Int) { orders(first: $n) { nodes { id total placedAt } } }', {\n  variables: { n: 500 },\n  path: 'orders.nodes',\n  headers: { authorization: `Bearer ${token}` },\n});\n```\n\nGraphQL `errors` reject the promise with their messages joined.\n\n## Apache Arrow, Parquet and DuckDB\n\n`addArrowTable(model, name, arrowTable, schema?)` adds a table from anything shaped like an Apache Arrow `Table` (`numRows`, `schema.fields`, `getChild(name).get(i)`). PrismBI doesn't depend on `apache-arrow`. BigInts become numbers, `Date` and `Timestamp` columns become `Date`s, and structs and lists become JSON text. Existing tables are refreshed in place, so calculated columns are kept.\n\nParquet files load through anything that produces Arrow, for example DuckDB-Wasm:\n\n```ts\nconst conn = await db.connect();\naddArrowTable(model, 'Trips', await conn.query(`SELECT * FROM 'trips.parquet' WHERE year = 2025`));\n```\n\n## SQL\n\nA `SqlAdapter` is one method, `query(sql, params?, signal?) => Promise<Row[]>`. Wrap a database driver behind your API, DuckDB-Wasm, or sql.js:\n\n```ts\nconst duck: SqlAdapter = { query: async (sql) => (await conn.query(sql)).toArray().map((r) => r.toJSON()) };\nawait loadSqlTables(model, duck, [\n  { table: 'Sales', sql: 'SELECT * FROM sales WHERE order_date >= ?', params: ['2024-01-01'] },\n  { table: 'Products', sql: 'SELECT * FROM products' },\n]);\n```\n\nTables load in parallel. Tables that already exist are refreshed, keeping their calculated columns and relationships.\n\n## Live data\n\n### Appending rows\n\n```ts\nmodel.appendRows('Ticks', rows, { maxRows: 100_000 });\n```\n\n`appendRows` adds rows to a table and notifies reports once. `maxRows` keeps a sliding window by dropping the oldest rows. Indexes and caches are extended rather than rebuilt, and only the visuals that read the changed table re-query.\n\n- Calculated columns that only read their own row (`Sales[Qty] * Sales[Price]`, `IF`, `FORMAT`, `YEAR`, …) are computed for the new rows only.\n- Calculated columns that aggregate (`SUM`, `CALCULATE`, `RANKX`, measures, `RELATED`, …), in this table or in any other, are recomputed in full. So are calculated tables.\n\n### Streaming\n\n```ts\nconst socket = new WebSocket('wss://example.com/ticks');\nconst live = streamInto(model, 'Ticks', socket, { maxRows: 50_000, intervalMs: 250 });\n// later\nlive.close();\n```\n\n`streamInto(model, table, source, options)` listens to any message source: a `WebSocket`, an `EventSource`, a `BroadcastChannel` or a worker port.\n\n- **Parsing:** each message is JSON-parsed when it is a string. It can be one row, an array of rows, `{ rows: [...] }` or column arrays. Pass `parse(data)` for other formats.\n- **Batching:** rows are batched and appended every `intervalMs` (default 250), so a fast feed re-renders visuals at a steady rate instead of once per message.\n- **Handle:** `onBatch` and `onError` report progress. The handle has `flush()`, `close()` (which also closes the source) and `received`.\n\n### Scheduled refresh\n\n```ts\nconst refresh = scheduleRefresh(model, 'Orders', (signal) => loadRest('/api/orders', { signal }), { intervalMs: 60_000 });\nrefresh.refresh(); // now\nrefresh.stop();\n```\n\nOptions:\n\n| Option | Default | Effect |\n|---|---|---|\n| `mode` | `'replace'` | Swap the table's rows on each refresh. `'append'` (with `maxRows`) adds them instead. `'incremental'` applies the table's refresh policy (below). |\n| `immediate` | `true` | Load once straight away. |\n| `pauseWhenHidden` | `true` | Skip ticks while the tab is hidden. |\n| `onRefresh` / `onError` | none | Report each successful refresh or failure. |\n\nA refresh that is still running when the next tick comes is not duplicated. Calling `refresh()` manually aborts the one in flight. `stop()` cancels everything.\n\n### Incremental refresh\n\nLarge tables don't need a full reload. A refresh policy reloads only the recent periods and keeps the history, as in Power BI:\n\n```ts\nmodel.setRefreshPolicy('Sales', {\n  column: 'OrderDate',\n  refresh: { last: 3, unit: 'month' },  // this month and the two before are replaced on every refresh\n  keep: { last: 5, unit: 'year' },      // optional: drop history older than five years\n});\n\n// load only the window from your source…\nconst since = periodStart(new Date(), 'month', 3);\nconst result = model.incrementalRefresh('Sales', await loadRest(`/api/sales?since=${since.toISOString()}`));\n// { from, keepFrom, kept, replaced, added, ignored, dropped }\n\n// …or on a schedule\nscheduleRefresh(model, 'Sales', (signal) => loadRest('/api/sales?since=…', { signal }), { intervalMs: 300_000, mode: 'incremental' });\n```\n\n- **Units:** `day`, `week` (weeks start on Monday), `month`, `quarter` and `year`. Periods are local calendar periods, counting the current one.\n- **Ignored rows:** incoming rows dated before the window are skipped, so a source that sends a little extra is harmless. Rows without a date count as history.\n- **What else updates:** calculated columns and transform steps update as on a full refresh. The column formats are kept.\n- **Saving:** the policy is saved in `model.toJSON().refreshPolicies`. `applyRefreshPolicy(existing, incoming, policy, now)` is the same merge as a pure function.\n",Me="# Custom visuals\n\nA visual is a plain object: its data roles plus a `render` function. PrismBI runs the query, works out the filters, cross-filtering and highlighting, and handles the chrome (title, header, focus mode, CSV export, show as table).\n\n```ts\nimport { defineVisual, registerVisual, svg as s, linearScale, bandScale, chart } from '@prismbi/prismbi';\n\nregisterVisual(defineVisual({\n  type: 'lollipop',\n  displayName: 'Lollipop chart',\n  category: 'chart',\n  roles: [\n    { name: 'category', displayName: 'Category', kind: 'grouping', required: true, drillable: true, multiple: true },\n    { name: 'values', displayName: 'Value', kind: 'measure', required: true },\n  ],\n  supportsHighlight: false,\n  defaultSort: 'value',\n  defaultFormat: { dataLabels: { show: true } },\n\n  render(ctx) {\n    const pv = chart.pivot(ctx);               // categories × series, entity-stable colours\n    if (!pv.categories.length) return chart.emptyState(ctx);\n    const [series] = pv.series;\n    const { width, height } = ctx;\n    const x = bandScale(pv.categories.length, [40, width - 8]);\n    const y = linearScale(0, Math.max(...series.values.map((v) => v ?? 0)), [height - 24, 8]);\n    const root = s('svg', { width, height, class: 'pbi-svg' });\n\n    pv.categories.forEach((cat, i) => {\n      const v = series.values[i];\n      if (v === null) return;\n      const cx = x(i) + x.bandwidth / 2;\n      root.append(s('line', { x1: cx, x2: cx, y1: y(0), y2: y(v), stroke: ctx.theme.axis, 'stroke-width': 2 }));\n      const dot = s('circle', { cx, cy: y(v), r: 6, fill: series.color, stroke: ctx.theme.surface, 'stroke-width': 2,\n        opacity: chart.markOpacity(ctx, cat.identity) });\n      // click to cross-filter, hover tooltip, keyboard access – one call\n      chart.interactive(ctx, dot, cat.identity, () => ({ title: cat.label, items: [{ label: series.name, value: ctx.fmt(series.field, v) }] }), cat.keys);\n      root.append(dot);\n    });\n    ctx.root.replaceChildren(root);\n  },\n}));\n```\n\nUse it like any built-in: `{ type: 'lollipop', fields: { category: 'Products[Name]', values: 'Total Sales' } }`.\n\n## The contract\n\n### `VisualDefinition`\n\n| Field | Meaning |\n|---|---|\n| `type`, `displayName`, `category` | Identity |\n| `roles` | Data wells. `kind`: `grouping` → `groupBy`, `measure` → `values`, `any` → handled by your own `buildQuery`. `drillable` + `multiple` makes the role a drill hierarchy |\n| `supportsHighlight` | Receive cross-highlights (`row.highlights`) instead of being filtered |\n| `isSlicer` | Contributes filters with `host.setFilter()` and is not filtered by itself |\n| `static` | Needs no data |\n| `defaultFormat` | Format defaults merged under the theme and spec |\n| `defaultSort` | `'value'` (first value, descending) or `'key'` |\n| `buildQuery(ctx, base)` | Optional: return a custom `QuerySpec` (e.g. add `totals: true`) |\n| `render(ctx)` | Draw into `ctx.root`. May return a cleanup function |\n\n### `RenderContext`\n\n| Member | Meaning |\n|---|---|\n| `root`, `width`, `height` | Target element and its size (re-rendered on resize) |\n| `data` | `QueryResult`: `groups`, `values`, `rows[{ keys, values, highlights? }]`, `totals`, `baseFilters` |\n| `role(name)` | `{ kind, indices, fields }`: where a role's fields sit in `data` |\n| `format`, `theme`, `spec`, `model` | Merged format pane, theme tokens, the spec and the model (for extra queries) |\n| `colorFor(field, value)`, `seriesColor(name, i)` | Entity-stable colours that honour `format.colors` |\n| `fmt(field, value, opts?)` | Format with the field's format string and display units |\n| `animate` | True when the data changed (not for a selection-only re-render) |\n| `host` | `select`, `isSelected`, `showTooltip`, `hideTooltip`, `setFilter`, `currentFilter`, `domain`, `drillDown`, `drillUp`, `drill`, `state`, `setState`, `emit`, `rerender` |\n\n### Helpers (exported)\n\n- `svg(tag, attrs)` (`s`) and `html(tag, attrs, ...children)` (`h`)\n- `barPath`, `arcPath`, `measureText`, `fitText`\n- `linearScale`, `bandScale`, `pointScale`, `niceStep`\n- `mix`, `ramp`, `textOn`, `contrastRatio`, `withAlpha`\n- `chart.*`: `pivot`, `renderLegend`, `withLegend`, `emptyState`, `interactive`, `markOpacity`, `drawValueAxisY/X`, `categoryLabelLayout`, `drawCategoryLabels`, `tooltipItems`, `labelFormatter`, `valueAxisFormatter`, `animateIn`\n\n### Tips\n\n- Respect `format.tooltip.show`, `format.dataLabels`, `format.legend` and `format.colors`, so users can customise your visual like a built-in.\n- Use theme tokens for every colour (`ctx.theme.foregroundSecondary` for text, never the series colour), so dark mode works.\n- Keep marks keyboard-accessible: `chart.interactive` adds `tabindex` and Enter/Space selection.\n",Ue="# Data modeling\n\n## Tables\n\n\n![The Studio data view of a table](../images/studio-data-view.png)\n```ts\nmodel.addTable(name, rows, schema?)                      // rows: object array\nmodel.addTable(name, DataTable.fromColumns(name, cols))  // fast path for column arrays\nmodel.refreshTable(name, rows)                           // replace data, keep calculated columns\nmodel.removeTable(name)\n```\n\n`schema` is a map of column name to `ColumnSchema`:\n\n| Option | Meaning |\n|---|---|\n| `type` | `'number' \\| 'string' \\| 'boolean' \\| 'date'`. Inferred when omitted |\n| `format` | Default format string, e.g. `'$#,0.00'`, `'0.0%'`, `'MMM yyyy'` |\n| `hidden` | Hidden from the field list (keys, helper columns) |\n| `sortBy` | Sort this column by another column, e.g. `Month` by `MonthNumber` |\n| `description` | Shown in field lists |\n\nBlank cells (`null`, `undefined`, `''`) become BLANK.\n\n## Relationships\n\n\n![Relationships in the Studio model view](../images/studio-model-view.png)\n```ts\nmodel.addRelationship({ from: 'Sales[ProductId]', to: 'Products[Id]' });\n```\n\n- `from` is the many side and `to` is the one side. The `to` column must hold unique values, and PrismBI checks this.\n- Filters flow from one to many, so a filter on `Products[Category]` narrows `Sales`. A filter on `Sales` does not narrow `Products`. Chains work, e.g. `Sales → Products → Subcategory → Category` (snowflake).\n- Two-way filtering (`crossFilter: 'both'`), many-to-many (`cardinality: 'manyToMany'`) and inactive relationships (`active: false` plus `USERELATIONSHIP`) are covered in [advanced modeling](advanced-modeling.md).\n\n## Measures\n\n```ts\nmodel.addMeasure('Total Sales', 'SUM(Sales[Amount])', { format: '$#,0', folder: 'Sales', description: '...' });\nmodel.addMeasure({ name: 'Margin %', expression: 'DIVIDE([Profit], [Total Sales])', format: '0.0%' });\nmodel.removeMeasure('Margin %');\n```\n\nMeasures are evaluated in the **filter context** of wherever they are used: a visual's grouping, slicers, page filters, and so on. They can reference other measures as `[Name]`. Results are memoised per filter context, and circular references are reported.\n\n## Calculated columns\n\n```ts\nmodel.addCalculatedColumn('Sales', 'Profit', 'Sales[Amount] - Sales[Cost]', { format: '$#,0' });\nmodel.addCalculatedColumn('Sales', 'Category', 'RELATED(Products[Category])');\nmodel.addCalculatedColumn('Products', 'Lifetime Sales', '[Total Sales]'); // context transition per row\n```\n\nThese are evaluated once per row, in row context, and stored like any other column.\n\n## Date tables\n\n```ts\nmodel.addDateTable('Date', '2024-01-01', '2025-12-31', { fiscalYearStartMonth: 7, weekStart: 1 });\n```\n\nColumns: `Date`, `Year`, `Quarter` (Q1…), `YearQuarter`, `Month` (January…), `MonthShort`, `MonthNumber`, `MonthYear` (Jan 2024), `Day`, `DayOfWeek`, `DayOfWeekNumber`, `WeekOfYear`, `IsWeekend`, `FiscalYear`, `FiscalQuarter`, plus hidden sort keys. Text columns sort chronologically.\n\nRelate the date table to your fact date column. Time-intelligence functions then work (see [expressions](expressions.md#time-intelligence)). For hierarchies, use several fields in a drillable role, e.g. `category: ['Date[Year]', 'Date[Quarter]', 'Date[Month]']`.\n\n## Querying directly\n\nVisuals use `model.query()`, and so can you (APIs, exports, tests):\n\n```ts\nconst result = model.query({\n  groupBy: ['Products[Category]', 'Date[Year]'],\n  values: ['Total Sales', { field: 'Sales[Qty]', aggregation: 'avg' }, { expression: '[Total Sales] * 1.1', name: 'Forecast' }],\n  filters: [{ target: 'Region[Name]', op: 'in', values: ['North', 'West'] }],\n  orderBy: [{ field: 'Total Sales', direction: 'desc' }],\n  top: 10,\n  totals: true,\n});\n// result.rows: [{ keys: ['Bikes', 2025], values: [6000, 1.2, 6600] }, ...]\n// result.totals: grand totals evaluated in the unfiltered-by-group context\n```\n\n| `QuerySpec` field | Meaning |\n|---|---|\n| `groupBy` | Column refs. Only combinations with data are returned (auto-exist) |\n| `values` | Measures, `Table[Column]` with an implicit aggregation, or `{ expression }` |\n| `filters` | `FilterSpec[]` (see [interactions](interactions.md#filter-reference)) |\n| `highlight` | Extra filters. Each row also gets `highlights[]` evaluated with them |\n| `orderBy`, `top` | Sort keys (group ref, value name, `{ value: i }` or `{ group: i }`) and a row limit |\n| `totals` | Also return grand totals |\n| `includeEmpty` | Keep rows where every value is blank |\n\nImplicit aggregations: `sum` (the default for numbers), `count` (the default for text), `avg`, `min`, `max`, `median`, `distinctCount`, `countRows`, `first`, `last`.\n\n## More modeling\n\nCalculated tables, calculation groups, field and what-if parameters, hierarchies, perspectives and row-level security are covered in [advanced modeling](advanced-modeling.md).\n\n## Field list and metadata\n\n```ts\nmodel.fields();   // [{ kind: 'column' | 'measure', table, name, ref, type, format, hidden }]\nmodel.toJSON();   // tables/columns/types, relationships, measures (no row data)\nmodel.onChange(() => ...);\n```\n\n## Try it\n\n```js playground\nreturn model.query({\n  groupBy: ['Region[Group]'],\n  values: ['Total Sales', 'Orders', 'Margin %'],\n  filters: [{ target: 'Date[Year]', op: 'eq', value: 2025 }],\n  orderBy: [{ field: 'Total Sales', direction: 'desc' }],\n  totals: true,\n});\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",Pe="# Expressions (DAX subset)\n\nPrismBI measures and calculated columns use a DAX-compatible syntax and semantics. If you know DAX, you already know this. This page lists what is supported today. The rest is scheduled in the [roadmap](../ROADMAP.md#phase-3-advanced-modeling-and-dax-coverage).\n\n## Syntax\n\n| Element | Example |\n|---|---|\n| Column | `Sales[Amount]`, `'Sales Data'[Net Amount]` |\n| Measure | `[Total Sales]` |\n| Table | `Sales`, `'Sales Data'` |\n| Numbers, text, booleans | `1.5`, `\"text\"` (`\"\"` escapes a quote), `TRUE`, `FALSE` |\n| Arithmetic | `+ - * / ^`, unary `-` |\n| Text concatenation | `&` |\n| Comparison | `= == <> < > <= >=` (`==` is strict: BLANK ≠ 0) |\n| Logic | `&& \\|\\| NOT`, `IN { \"a\", \"b\" }` |\n| Variables | `VAR x = [Sales] VAR y = [Cost] RETURN x - y` |\n| Comments | `-- line`, `// line`, `/* block */` |\n\n## Semantics\n\n- **BLANK:** `BLANK() + 1 = 1`, `BLANK() * 5 = BLANK`, and `BLANK() = 0` and `BLANK() = \"\"` are TRUE. `DIVIDE` returns BLANK, or its third argument, when dividing by zero.\n- **Filter context:** aggregations see the rows visible under the current filters, which come from slicers, visual grouping, page and report filters, and `CALCULATE`.\n- **Row context:** iterators (`SUMX`, `FILTER`, …) and calculated columns evaluate per row. Inside them, `Table[Column]` reads the current row. A bare table reference or `VALUES()` inside a row context still sees the whole filter context (no transition), so `FILTER(Sales, Sales[Amount] > EARLIER(Sales[Amount]))` in a calculated column scans every row.\n- **Context transition:** a measure reference or `CALCULATE` inside a row context turns the current row into filters. For example, `MAXX(Products, [Total Sales])` gives the best-selling product's sales.\n- **CALCULATE filter arguments:**\n  - `Table[Col] = value` or any boolean expression over **one column** replaces the existing filters on that column.\n  - A table expression (`FILTER(...)`, `VALUES(...)`, `DATESYTD(...)`) filters by its rows or values.\n  - `ALL(Table)` / `REMOVEFILTERS(Table)` removes the filters on a table (and the tables it reaches). `ALL(Table[Col], …)` removes them for those columns only.\n  - `ALLEXCEPT(Table, Table[Col]…)` removes all except the listed columns.\n  - `ALLSELECTED(...)` removes only the filters introduced by the visual's own grouping, which gives \"share of what's selected\".\n  - `KEEPFILTERS(expr)` intersects with existing filters instead of replacing them.\n  - `USERELATIONSHIP(a, b)` activates an inactive relationship. `CROSSFILTER(a, b, BOTH | ONEWAY | NONE)` changes a relationship's direction for that evaluation.\n\n## Function reference\n\n### Aggregation\n`SUM` · `AVERAGE` · `MIN` · `MAX` (one column, or two scalars) · `MEDIAN` · `COUNT` · `COUNTA` · `COUNTBLANK` · `COUNTROWS` · `DISTINCTCOUNT` · `DISTINCTCOUNTNOBLANK` · `PRODUCT`\n\n### Iterators\n`SUMX` · `AVERAGEX` · `MINX` · `MAXX` · `MEDIANX` · `PRODUCTX` · `COUNTX` · `COUNTAX` · `CONCATENATEX(table, expr, [delimiter], [orderBy], [ASC|DESC])` · `RANKX(table, expr, [value], [ASC|DESC], [SKIP|DENSE])`\n\n### Filter and context\n`CALCULATE` · `CALCULATETABLE` · `FILTER` · `ALL` · `REMOVEFILTERS` · `ALLEXCEPT` · `ALLSELECTED` · `KEEPFILTERS` · `VALUES` · `DISTINCT` · `TOPN(n, table, orderBy, [ASC|DESC])` · `SELECTEDVALUE(col, [alternate])` · `HASONEVALUE` · `ISFILTERED` · `RELATED` · `RELATEDTABLE`\n\n### Time intelligence\nThese need a date table related to your facts. See [data-model.md](data-model.md#date-tables).\n\n`TOTALYTD(expr, dates, [filter], [yearEnd \"mm-dd\"])` · `TOTALQTD` · `TOTALMTD` · `DATESYTD(dates, [yearEnd])` · `DATESQTD` · `DATESMTD` · `SAMEPERIODLASTYEAR` · `DATEADD(dates, n, DAY|MONTH|QUARTER|YEAR)` · `PARALLELPERIOD` · `PREVIOUSMONTH` · `PREVIOUSQUARTER` · `PREVIOUSYEAR` · `DATESBETWEEN(dates, start, end)` · `FIRSTDATE` · `LASTDATE`\n\nUsed inside `CALCULATE`, these clear the other filters on the date table (Power BI \"mark as date table\" behaviour). So `CALCULATE([Sales], SAMEPERIODLASTYEAR(Date[Date]))` works inside a visual grouped by `Date[Year]`.\n\n### Relationships & lookups\n`USERELATIONSHIP` · `CROSSFILTER` · `TREATAS(table, col…)` · `LOOKUPVALUE(result, searchCol, value, …, [alternate])` · `CONTAINS(table, col, value, …)`\n\n### Table functions\n`SUMMARIZE(table, groupBy…, \"Name\", expr…)` · `SUMMARIZECOLUMNS(groupBy…, [filterTable…], \"Name\", expr…)` · `ADDCOLUMNS` · `SELECTCOLUMNS` · `CROSSJOIN` · `UNION` · `INTERSECT` · `EXCEPT` · `GENERATE` · `NATURALINNERJOIN` · `NATURALLEFTOUTERJOIN` · `SAMPLE(n, table, orderBy, [ASC|DESC]…)` · `ROW` · `DATATABLE(\"Col\", TYPE, …, {{…}, {…}})` · `GENERATESERIES` · `CALENDAR` · `FIRSTNONBLANK` · `LASTNONBLANK` · `ALLNOBLANKROW`\n\n### Statistical\n`STDEV.S` · `STDEV.P` · `VAR.S` · `VAR.P` · `STDEVX.S` · `STDEVX.P` · `VARX.S` · `VARX.P` · `PERCENTILE.INC` · `PERCENTILE.EXC` · `PERCENTILEX.INC` · `PERCENTILEX.EXC` · `GEOMEAN` · `GEOMEANX` · `AVERAGEA` · `MAXA` · `MINA`\n\n### Row context, parent-child & scope\n`EARLIER(col, [n])` · `EARLIEST` · `PATH(id, parent)` · `PATHLENGTH` · `PATHITEM` · `PATHITEMREVERSE` · `PATHCONTAINS` · `ISINSCOPE(col)` · `ISCROSSFILTERED`\n\n### Calculation groups & security\n`SELECTEDMEASURE` · `SELECTEDMEASURENAME` · `ISSELECTEDMEASURE` · `USERNAME` · `USERPRINCIPALNAME` · `CUSTOMDATA`. See [advanced modeling](advanced-modeling.md).\n\n### Logical\n`IF` · `IFERROR` · `SWITCH` (including `SWITCH(TRUE(), …)`) · `AND` · `OR` · `NOT` · `TRUE` · `FALSE` · `BLANK` · `ISBLANK` · `ISNUMBER` · `ISTEXT` · `ISEMPTY` · `COALESCE`\n\n### Math\n`DIVIDE` · `ABS` · `ROUND` · `ROUNDUP` · `ROUNDDOWN` · `TRUNC` · `INT` · `CEILING` · `FLOOR` · `SQRT` · `POWER` · `MOD` · `EXP` · `LN` · `LOG` · `LOG10` · `SIGN` · `PI`\n\n### Text\n`CONCATENATE` · `COMBINEVALUES` · `UPPER` · `LOWER` · `LEN` · `TRIM` · `LEFT` · `RIGHT` · `MID` · `SUBSTITUTE` · `REPT` · `SEARCH` · `FIND` · `CONTAINSSTRING` · `EXACT` · `VALUE` · `FORMAT(value, \"format\")`\n\n### Date and time\n`DATE` · `DATEVALUE` · `TODAY` · `NOW` · `UTCNOW` · `UTCTODAY` · `YEAR` · `QUARTER` · `MONTH` · `DAY` · `HOUR` · `MINUTE` · `SECOND` · `WEEKDAY(date, [1|2|3])` · `WEEKNUM` · `EOMONTH` · `EDATE` · `NETWORKDAYS` · `DATEDIFF(start, end, DAY|WEEK|MONTH|QUARTER|YEAR|HOUR|MINUTE|SECOND)` · date arithmetic (`date + 1` adds a day, `date - date` gives days)\n\n## Querying with table expressions\n\n```ts\nmodel.evaluateTable('SUMMARIZECOLUMNS(Products[Category], \"Sales\", [Total Sales], \"Margin\", [Margin %])');\n```\n\nThis works like a DAX query's `EVALUATE` and returns `{ columns, rows }`. Editor tooling (completion, diagnostics, formatting) is covered in [tooling.md](tooling.md).\n\n## Patterns\n\n```dax\n-- % of grand total\nDIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Products)))\n\n-- % of what's selected (respects slicers, ignores the visual's own grouping)\nDIVIDE([Total Sales], CALCULATE([Total Sales], ALLSELECTED(Products)))\n\n-- Year over year\nVAR ly = CALCULATE([Total Sales], SAMEPERIODLASTYEAR(Date[Date]))\nRETURN IF(ISBLANK(ly), BLANK(), DIVIDE([Total Sales] - ly, ly))\n\n-- Running total within the year\nTOTALYTD([Total Sales], Date[Date])\n\n-- Rank of the current product\nRANKX(ALL(Products[Name]), [Total Sales])\n\n-- Sales of big orders only\nCALCULATE([Total Sales], Sales[Amount] >= 1000)\n\n-- Dynamic title text\n\"Sales for \" & SELECTEDVALUE(Region[Name], \"all regions\")\n```\n\n## Errors\n\nErrors carry readable messages, and a failing visual shows the message in place:\n\n- `DaxSyntaxError`: includes the position and a snippet, e.g. `Expected rparen at position 17: SUM(Sales[Amount]⟦⟧`\n- `A single value for column 'Sales'[Amount] cannot be determined…`: a bare column used outside row context\n- `Circular dependency detected: A → B → A`\n- `Function X is not supported (yet)`\n\n## Window functions\n\n`OFFSET`, `INDEX`, `WINDOW`, `RANK` and `ROWNUMBER` work over an ordered relation, by default the ALLSELECTED values of the `ORDERBY` and `PARTITIONBY` columns:\n\n```dax\nPrev Year Sales = CALCULATE([Total Sales], OFFSET(-1, ALLSELECTED(Date[Year]), ORDERBY(Date[Year])))\nRunning Total   = CALCULATE([Total Sales], WINDOW(1, ABS, 0, REL, ALLSELECTED(Date[MonthNumber]), ORDERBY(Date[MonthNumber])))\nMoving Avg 3    = AVERAGEX(WINDOW(-2, REL, 0, REL, ALLSELECTED(Date[MonthNumber]), ORDERBY(Date[MonthNumber])), [Total Sales])\nCategory Rank   = RANK(DENSE, ALLSELECTED(Product[Category]), ORDERBY([Total Sales], DESC))\nRow In Year     = ROWNUMBER(ALLSELECTED(Date[Year], Date[MonthNumber]), ORDERBY(Date[MonthNumber]), PARTITIONBY(Date[Year]))\n```\n\n- **`ORDERBY`** takes columns or expressions (measures are evaluated per row), each optionally followed by `ASC` or `DESC`.\n- **Ties:** `RANK` uses competition ranking by default (`SKIP`: 1, 2, 2, 4), or `DENSE` (1, 2, 2, 3).\n- **Current row:** taken from the row context, or from the single value of each relation column in the filter context.\n- **No current row:** when a partition column has no single value, `OFFSET`, `INDEX` and `WINDOW` return an empty table and `RANK` / `ROWNUMBER` return BLANK.\n\n## Visual calculations\n\nA visual calculation is computed over a visual's own rows: after sorting and Top N, in display order. It is often simpler than a measure:\n\n```ts\nfields: {\n  category: 'Date[MonthYear]',\n  values: [\n    'Total Sales',\n    { name: 'Running total', visualCalc: 'RUNNINGSUM([Total Sales])' },\n    { name: 'vs previous', visualCalc: '[Total Sales] - PREVIOUS([Total Sales])', format: '$#,0' },\n    { name: 'Share', visualCalc: 'PERCENTOFTOTAL([Total Sales])', format: '0.0%' },\n  ],\n}\n```\n\n| Function | Result |\n|---|---|\n| `RUNNINGSUM(x)` | running total |\n| `MOVINGAVERAGE(x, n)` | average of the last `n` rows |\n| `PREVIOUS(x [, k])`, `NEXT(x [, k])` | value `k` rows back or ahead |\n| `FIRST(x)`, `LAST(x)` | first or last value |\n| `RANK(x [, \"ASC\"])`, `ROWNUMBER()` | rank (descending by default), position |\n| `PERCENTOFTOTAL(x)` | share of the column total |\n\n- **References:** `[Name]` refers to another value of the same visual.\n- **Scalar functions:** arithmetic and comparisons, `DIVIDE`, `ABS`, `ROUND`, `IF`, `BLANK`, `ISBLANK`, and two-argument `MIN` / `MAX`.\n- **Restarting per group:** with two or more group columns, `reset: 'parent'` restarts window functions for each outer group. Year-to-date by month is `{ visualCalc: 'RUNNINGSUM([Sales])', reset: 'parent' }` grouped by year then month.\n\n## Try it\n\n```js playground\nreturn {\n  total: model.evaluate('[Total Sales]'),\n  bikes2025: model.evaluate('CALCULATE([Total Sales], Product[Category] = \"Bikes\", Date[Year] = 2025)'),\n  bestMonth: model.evaluate('MAXX(VALUES(Date[MonthYear]), [Total Sales])'),\n  categories: model.evaluateTable('ADDCOLUMNS(VALUES(Product[Category]), \"Sales\", [Total Sales])').rows,\n};\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",Be=`# Report files and version control

A report is one JSON document. That's convenient to load, but every change touches the same big file. \`@prismbi/prismbi/files\` stores it as a folder of small, stable files instead, so reviews show exactly what changed and branches merge cleanly.

\`\`\`
report.json                          name, version, report filters, page and bookmark order
pages/overview/page.json             page settings and visual order
pages/overview/visuals/cols.json     one file per visual
pages/overview/visuals/year.json
bookmarks/bikes-only.json            one file per bookmark
\`\`\`

## API

\`\`\`ts
import { splitReport, joinReport, diffReports, formatDiff, stableStringify } from '@prismbi/prismbi/files';

const files = splitReport(report.toJSON());   // { 'report.json': '…', 'pages/overview/page.json': '…', … }
const def = joinReport(files);                // back to a ReportDefinition (migrated to the current schema)
console.log(formatDiff(diffReports(before, after)));
\`\`\`

- **Stable output.**
  - Keys come in a fixed order: \`id\`, \`name\`, \`type\`, \`title\`, \`layout\`, \`fields\`, … then alphabetical.
  - Small flat objects such as \`layout\` stay on one line.
  - Id lists go one per line.
  - Dates are tagged \`{"$date": "…"}\`.
  - Splitting the same report twice gives identical files.
- **Ids.** Folder and file names come from page and visual ids. Pages and visuals without an id get one, derived from their name, or from their type and position. Renaming a visual's title never moves its file.
- **Merge-tolerant joins.** A visual file that isn't in its page's order list is appended, which happens when two branches each add a visual. A listed id whose file was deleted is skipped. Broken JSON reports the file it came from.
- **Plain-language diffs.**
  - **What it compares:** two definitions or JSON strings.
  - **What it reports:** pages, visuals and bookmarks added, removed or reordered, plus every changed property with its path.
  - **Output:** \`formatDiff\` prints one line per change: \`+\` added, \`-\` removed, \`~\` changed, \`↕\` reordered.

\`\`\`
- page "Overview" › visual "year"
~ page "Overview" › visual "Sales by category" › format.dataLabels.show: true → false
+ page "Details" › visual "kpi"
↕ page order: ["overview","details"] → ["details","overview"]
\`\`\`

## Command line

The package installs a \`prismbi\` command (\`npx @prismbi/prismbi\` runs it without installing):

\`\`\`bash
npx @prismbi/prismbi split report.json reports/sales      # write the folder
npx @prismbi/prismbi join reports/sales report.json       # rebuild one file (stdout without a file name)
npx @prismbi/prismbi diff old.json reports/sales          # either side may be a JSON file or a split folder
\`\`\`

\`diff\` exits with code 1 when there are changes and 0 when there are none, so it fits in CI checks and pre-commit hooks.

## Try it

\`\`\`js playground
import { splitReport, diffReports, formatDiff } from '@prismbi/prismbi/files';

const before = { name: 'Sales', pages: [{ id: 'p1', name: 'Overview', visuals: [{ id: 'v1', type: 'card', fields: { value: 'Total Sales' } }] }] };
const after = { ...before, pages: [{ ...before.pages[0], visuals: [{ ...before.pages[0].visuals[0], type: 'kpi' }] }] };
return { files: Object.keys(splitReport(before)), diff: formatDiff(diffReports(before, after)) };
\`\`\`

On the docs site (\`npm run docs\`), **▶ Run in playground** opens it in an editor next to its output.
`,Fe=`# Web components, Vue, Svelte and Angular

\`@prismbi/prismbi/elements\` defines two custom elements when imported: \`<prism-report>\` and \`<prism-visual>\`. Frameworks set DOM properties and listen to DOM events natively, so the same elements work in plain HTML, Vue, Svelte, Angular, Solid and Lit. React users can also use [\`@prismbi/prismbi/react\`](react.md).

Elements render into the light DOM, so the report stylesheet and your CSS variables apply as usual. Give them a height.

## \`<prism-report>\`

| Property | Attribute | Description |
|---|---|---|
| \`model\` | \`model="name"\` | The \`DataModel\`. The attribute names a model registered with \`registerModel(name, model)\`, which is handy in plain HTML. |
| \`definition\` | \`src="/report.json"\` | The report definition (object or JSON). \`src\` fetches it. Setting a new definition reloads the same report. |
| \`theme\` | \`theme="dark"\` | Theme name or object. Changing it re-themes without rebuilding. |
| \`filters\` | — | Controlled report-level filters. |
| \`chrome\` | — | Toolbar, page tabs, filter pane. |
| — | \`locale\`, \`page\` | Number and date locale; current page (id or name). |
| \`report\` (read-only) | — | The underlying \`Report\`, for the imperative API. |

Report events are re-dispatched as DOM events with the same name and the payload in \`detail\`: \`selectionChanged\`, \`filtersChanged\`, \`pageChanged\`, \`dataPointClick\`, \`drill\`, \`rendered\` and \`error\`.

## \`<prism-visual>\`

One visual for your own layout:
- **Properties:** \`model\` and \`spec\` (\`{ type, fields, format, filters, … }\`).
- **Attributes:** \`type\`, \`fields\` and \`format\` (both as JSON), \`title\`, \`model\`, \`theme\` and \`locale\`.

## Plain HTML


![Web components in a plain HTML page](../images/web-components.png)
\`\`\`html
<prism-visual model="sales" type="card" fields='{"value":"Total Sales"}' style="height: 200px"></prism-visual>
<prism-report model="sales" src="/reports/sales.json" style="height: 720px"></prism-report>

<script type="module">
  import { registerModel } from '@prismbi/prismbi/elements';
  registerModel('sales', buildModel()); // every element naming "sales" mounts now
<\/script>
\`\`\`

Try it with \`npm run dev\`, then open \`/elements.html\`.

## Vue 3

Tell the compiler that \`prism-*\` tags are custom elements:

\`\`\`ts
// vite.config.ts
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('prism-') } } });
\`\`\`

\`\`\`vue
<script setup lang="ts">
import '@prismbi/prismbi/elements';
const model = buildModel();
const definition = { pages: [/* … */] };
<\/script>

<template>
  <prism-report :model="model" :definition="definition" theme="dark" style="height: 720px"
    @selectionChanged="(e) => console.log(e.detail.filters)" />
</template>
\`\`\`

Vue passes objects to custom elements as properties automatically. Use \`.prop\` if you need to force it.

## Svelte

\`\`\`svelte
<script>
  import '@prismbi/prismbi/elements';
  import { prismReport } from '@prismbi/prismbi/elements';
  const model = buildModel();
<\/script>

<prism-report {model} definition={report} on:dataPointClick={(e) => console.log(e.detail)} style="height: 720px" />

<!-- or as an action on any element -->
<div use:prismReport={{ model, definition: report, theme: 'dark', on: { pageChanged: (e) => console.log(e) } }} style="height: 720px" />
\`\`\`

\`prismVisual\` is the matching action for a single visual.

## Angular

\`\`\`ts
@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<prism-report [model]="model" [definition]="definition" theme="light"
               (selectionChanged)="onSelect($event.detail)" style="display:block;height:720px"></prism-report>\`,
})
export class DashboardComponent {
  model = buildModel();
  definition = salesReport;
}
// main.ts
import '@prismbi/prismbi/elements';
\`\`\`

## Custom tag names

\`defineElements({ report: 'acme-report', visual: 'acme-visual' })\` registers the same elements under other names, if \`prism-*\` clashes with something else on the page.
`,Ve=`# Getting started


![The demo report: slicers, KPI cards, charts and a table, all cross-filtering each other](../images/report-overview.png)
## Install

\`\`\`bash
npm install @prismbi/prismbi
# React bindings are included; React is an optional peer dependency
\`\`\`

PrismBI ships as ES modules and CommonJS, with full type declarations. It has no runtime dependencies. Its stylesheet is injected automatically the first time a report is created.

## 1. Load data into a model

Any array of plain objects works. Types are inferred (number, string, boolean, date), and ISO date strings become dates.

\`\`\`ts
import { DataModel } from '@prismbi/prismbi';

const model = new DataModel()
  .addTable('Sales', await (await fetch('/api/sales')).json(), {
    Amount: { format: '$#,0.00' },   // optional per-column schema
    ProductId: { hidden: true },
  })
  .addTable('Products', products)
  .addDateTable('Date', '2024-01-01', '2025-12-31');
\`\`\`

## 2. Relate tables

Relationships go from the **many** side (facts) to the **one** side (dimensions). Filters on a dimension flow to the facts.

\`\`\`ts
model
  .addRelationship({ from: 'Sales[ProductId]', to: 'Products[Id]' })
  .addRelationship({ from: 'Sales[OrderDate]', to: 'Date[Date]' });
\`\`\`

## 3. Write measures

\`\`\`ts
model
  .addMeasure('Total Sales', 'SUM(Sales[Amount])', { format: '$#,0' })
  .addMeasure('Orders', 'COUNTROWS(Sales)')
  .addMeasure('Avg Order', 'DIVIDE([Total Sales], [Orders])', { format: '$#,0.00' })
  .addMeasure('Sales LY', 'CALCULATE([Total Sales], SAMEPERIODLASTYEAR(Date[Date]))');

model.evaluate('[Total Sales]');                                                        // 6750
model.evaluate('[Total Sales]', [{ target: 'Products[Category]', op: 'eq', value: 'Bikes' }]); // 6000
\`\`\`

## 4. Build a report

Each visual has a \`type\`, a grid \`layout\` (12 columns by default, 44 px rows), \`fields\` bound to its data roles, and optional \`format\` options.

\`\`\`ts
import { Report } from '@prismbi/prismbi';

const report = new Report(document.getElementById('app')!, {
  model,
  name: 'Sales',
  pages: [
    {
      name: 'Overview',
      visuals: [
        { id: 'year', type: 'slicer', layout: { x: 0, y: 0, w: 12, h: 2 }, fields: { field: 'Date[Year]' }, format: { slicer: { style: 'tiles' } } },
        { type: 'card', layout: { x: 0, y: 2, w: 3, h: 3 }, fields: { value: 'Total Sales' } },
        { type: 'card', layout: { x: 3, y: 2, w: 3, h: 3 }, fields: { value: 'Avg Order' } },
        { type: 'clusteredColumn', title: 'Sales by category', layout: { x: 0, y: 5, w: 6, h: 7 },
          fields: { category: ['Products[Category]', 'Products[Name]'], values: 'Total Sales' } },
        { type: 'line', title: 'Trend', layout: { x: 6, y: 5, w: 6, h: 7 },
          fields: { category: 'Date[MonthShort]', values: ['Total Sales', 'Sales LY'] } },
      ],
    },
  ],
});
\`\`\`

The container needs a height, because the report fills it. Give \`#app\` a fixed height, or \`height: 100%\` inside a sized parent.

## 5. React to users

\`\`\`ts
report.on('selectionChanged', (e) => console.log('selected', e.filters));
report.on('filtersChanged', (e) => console.log(e.scope, e.filters));
report.setSlicerSelection('year', [{ target: 'Date[Year]', op: 'in', values: [2025] }]);
\`\`\`

## 6. Save and restore

\`\`\`ts
localStorage.setItem('report', JSON.stringify(report.toJSON()));
const definition = Report.parse(localStorage.getItem('report')!); // revives dates
new Report(el, { model, ...definition });
\`\`\`

## Next

- [Data modeling](data-model.md) · [Expressions](expressions.md) · [Visuals](visuals.md) · [Interactions](interactions.md) · [Theming](theming.md) · [React](react.md) · [Custom visuals](custom-visuals.md)
- Run the demo: \`npm run dev\` and open http://localhost:5173. It has about 31k rows, 8 pages (including tooltip and drill-through pages), and 61 visual instances.

## Try it

One visual, bound to the demo model:

\`\`\`js playground
import { createVisual } from '@prismbi/prismbi';

return createVisual(el, {
  model,
  type: 'clusteredColumn',
  title: 'Sales by category',
  fields: { category: 'Product[Category]', values: 'Total Sales' },
  format: { dataLabels: { show: true } },
});
\`\`\`

On the docs site (\`npm run docs\`), **▶ Run in playground** opens it in an editor next to its output.
`,je=`# Slicing, filtering and interactions

PrismBI gives you every Power BI way of narrowing data down, and each one is scriptable.

![Clicking a bar cross-filters every other visual on the page](../images/report-cross-filter.png)

| Mechanism | Scope | Set by |
|---|---|---|
| Report filters | all pages | filter pane, \`report.setReportFilters()\`, \`definition.filters\` |
| Page filters | one page | filter pane, \`report.setPageFilters()\`, \`page.filters\` |
| Visual filters | one visual | filter pane (click the visual first), \`report.setVisualFilters()\`, \`visual.filters\` |
| Slicers | other visuals on the page | user, \`report.setSlicerSelection()\` |
| Cross-filter / cross-highlight | other visuals on the page | clicking data points, legend entries or table rows |
| Drill | one visual | double-click a data point, or the header ↑ / ⇊ / ⤓ |
| Include / Exclude | one visual (becomes a visual filter) | right-click a data point |
| Drill-through | a target page | right-click a data point, \`report.drillThrough()\` |
| Decomposition tree | other visuals on the page | clicking nodes in the tree |

All of them compose with AND.

## Slicers

\`\`\`ts
{ id: 'region', type: 'slicer', title: 'Region', fields: { field: 'Region[Name]' },
  format: { slicer: { style: 'tiles', single: false } } }
\`\`\`

| Style | Best for | Behaviour |
|---|---|---|
| \`list\` | text, few to hundreds of values | checkboxes, Select all, search once there are more than 7 values |
| \`dropdown\` | saving space | the same list in a popover |
| \`tiles\` | a handful of values | buttons. Click selects one value, Ctrl/⌘+click adds more (\`single: false\` makes every click add) |
| \`between\` | numbers and dates (default for dates) | from/to inputs plus a dual-thumb slider |
| \`relative\` | dates | Last, Next or This N days, weeks, months or years |
| tree | hierarchies (several fields) | tri-state checkboxes, expand/collapse, search. Emits an exact path filter, so "Road Bikes" under Bikes doesn't also match another category's "Road Bikes" |

A slicer filters every other visual on its page, but not itself. Its own list of values is narrowed by the other filters and slicers, so you get cascading slicers for free.

\`\`\`ts
report.setSlicerSelection('region', [{ target: 'Region[Name]', op: 'in', values: ['North'] }]);
report.setSlicerSelection('region', null); // clear
\`\`\`

### Hierarchy slicer

\`\`\`ts
{ type: 'slicer', fields: { field: ['Product[Category]', 'Product[Subcategory]', 'Product[Name]'] } }
\`\`\`

### Sync slicers across pages

Slicers with the same \`syncGroup\` share one selection on every page, whatever their style:

\`\`\`ts
{ type: 'slicer', fields: { field: 'Date[Year]' }, format: { slicer: { style: 'tiles', syncGroup: 'year' } } }   // page 1
{ type: 'slicer', fields: { field: 'Date[Year]' }, format: { slicer: { style: 'dropdown', syncGroup: 'year' } } } // page 2
\`\`\`

## Cross-filtering and cross-highlighting

Clicking a data point selects it. **Ctrl** or **⌘** + click adds to the selection, clicking the same point again clears it, and clicking empty space or pressing **Esc** clears everything. Every other visual on the page reacts:

- **highlight** is the default for column, bar, line, area, pie, donut, treemap, funnel and scatter. They keep their full values faded and draw the selected portion solid.
- **filter** is the default for everything else. They re-query with the selection as a filter.
- **none** means the visual ignores selections.

\`\`\`ts
{ type: 'line', interaction: 'filter', ... }                       // how this visual reacts
{ type: 'card', interactionsFrom: { 'by-category': 'none' }, ... } // per source visual
\`\`\`

The source visual dims unselected marks. Clicking a legend entry selects the whole series. A table or matrix row selects its group values.

## Drill down

Put several fields in a drillable role to create a hierarchy:

\`\`\`ts
fields: { category: ['Date[Year]', 'Date[Quarter]', 'Date[Month]'], values: 'Total Sales' }
\`\`\`

- Double-clicking a data point drills into that member. For example, 2025 shows that year's quarters.
- **↑** drills up a level.
- **⇊ Go to next level** shows all members of the next level, without a parent filter.
- A breadcrumb under the title shows the path, e.g. \`Year: 2025 › Quarter: Q2\`.

\`\`\`ts
report.visual('trend').drillDown(2025);
report.visual('trend').drillUp();
report.on('drill', (e) => console.log(e.level, e.path));
\`\`\`

**Expand all down one level** (header ⤓, or \`report.visual(id).expandAll()\`) shows two levels together, e.g. "Bikes · Road Bikes". Drill up collapses it again.

## Right-click: Include, Exclude, Drill through

Right-clicking any data point, table row or matrix row opens a menu:

![The data point context menu: Include, Exclude, Drill through and Explain this](../images/report-context-menu.png)

- **Include** keeps only that data point in this visual. **Exclude** removes it. Both are added as visual-level filters, so they show in the filter pane and can be cleared there or with **Clear visual filters**.
- **Drill through: <page>** appears for every page whose \`drillthrough.fields\` match the data point.
- **Clear selection** appears when something is selected.

## Drill-through pages

\`\`\`ts
{
  id: 'product-detail',
  name: 'Product details',
  hidden: true,                                    // reachable only via drill-through
  drillthrough: { fields: ['Product[Category]', 'Product[Name]'], keepAllFilters: true },
  visuals: [ /* cards, trends, tables about one product */ ],
}
\`\`\`

Drilling through filters the target page to the data point's values for those fields. When \`keepAllFilters\` is on (the default), the target also gets the source visual's filters: slicers, page and visual filters, and the selection. A **← Back** button appears in the toolbar, and the filter pane gets a "Drill through" section you can edit.

\`\`\`ts
report.drillThrough('product-detail', [{ target: 'Product[Name]', op: 'eq', value: 'Road-150' }]);
report.back();
report.on('drillThrough', (e) => console.log(e.fromPageId, '→', e.toPageId, e.filters));
\`\`\`

## Decomposition tree


![The decomposition tree splitting Total Sales by category and region](../images/decomposition-tree.png)
\`\`\`ts
{ type: 'decompositionTree', fields: { values: 'Total Sales', explainBy: ['Product[Category]', 'Region[Group]', 'Sales[Channel]'] } }
\`\`\`

Pick a field to split the total by, click a node, and split that node by another field. Each step narrows the analysis, and the selected path cross-filters the rest of the page. **High value (auto)** and **Low value (auto)** pick the field whose biggest (or smallest) member stands out most.

## Report tooltips

Design a small page and mark it as a tooltip page. Any visual can then show it on hover, filtered to the hovered data point plus that visual's filters:

\`\`\`ts
{ id: 'tip-cat', name: 'Category tooltip', tooltip: { width: 320, height: 210 }, layout: { columns: 2, rowHeight: 30 },
  visuals: [ { type: 'card', fields: { value: 'Total Sales' }, layout: { x: 0, y: 0, w: 1, h: 2 } }, /* … */ ] }

{ type: 'clusteredColumn', fields: { … }, format: { tooltip: { page: 'tip-cat' } } }
\`\`\`

Tooltip pages never appear as tabs.

## Edit interactions

The **Edit interactions** toolbar button works like Power BI's. Click a visual, and every other visual shows **Filter / Highlight / None**, which sets how it reacts to selections in the visual you clicked. From code:

\`\`\`ts
report.toggleEditInteractions(true);
report.setInteraction('by-category', 'kpi-card', 'none');   // stored as spec.interactionsFrom
\`\`\`

## The filter pane

Turn it on with \`chrome: { filterPane: true }\` (a toolbar toggle) or \`'open'\`. It lists filter cards for **this visual** (the last one clicked), **this page** and **all pages**. Each card has three modes:

![The filter pane with report, page and visual filters](../images/report-filter-pane.png)

- **Basic:** tick values from the column's full domain, with search.
- **Advanced:** contains, does not contain, starts with, ends with, is, is not, >, ≥, <, ≤, is blank, is not blank.
- **Top N:** top or bottom N items, ranked by any measure.

Use **+ Add data field** to add a card for any visible column. An empty card means "is (All)" and filters nothing.

## Filter reference

\`\`\`ts
type FilterSpec =
  | { target: 'Table[Col]', op: 'in' | 'notIn', values: CellValue[] }
  | { target, op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte', value }
  | { target, op: 'between', min?, max? }                       // inclusive, open-ended allowed
  | { target, op: 'contains' | 'notContains' | 'startsWith' | 'endsWith', value } // case-insensitive
  | { target, op: 'isBlank' | 'isNotBlank' }
  | { targets: ['T[a]', 'T[b]'], op: 'tuples', tuples: [[a1, b1], [a2, b2]], exclude?: true }  // multi-column selections
  | { target, op: 'topN', n: 5, by: 'Total Sales', direction?: 'top' | 'bottom' };
\`\`\`

Filters on a dimension column flow to related fact tables. Filters on a fact column don't flow back to dimensions (single-direction relationships).

## Export

- Per visual: header **⇩** → CSV, Excel, PNG or SVG. In code: \`report.visual(id).exportCsv() / exportXlsx() / exportImage('png') / toSvg()\`.
- Per page: toolbar **Export PDF**, or \`await report.exportPdf({ pages: 'current' | 'all' })\`. Each report page becomes one PDF page. The PDF writer has no dependencies and only loads when used.
- Data to Excel: toolbar **Export Excel**, or \`await report.exportXlsx({ pages: 'current' | 'all' })\`. Every visual with data becomes one sheet, in reading order (top to bottom, then left to right), named after its title, with \`Page - Title\` names when exporting all pages. Cells keep their types: numbers, dates and booleans, not text. Measure and column format strings become Excel number formats, and the header row is bold, frozen and filterable. \`toXlsx()\` returns the bytes instead of downloading, on the report and on each visual.
- Your own workbooks: \`buildXlsx(sheets)\` writes any \`{ name, columns: [{ header, format, width }], rows }\` sheets, and \`resultToSheet(model.query(spec), name)\` turns a query result into one. Like the PDF writer it has no dependencies; files are stored uncompressed.

\`\`\`js playground
import { buildXlsx, resultToSheet } from '@prismbi/prismbi';

const sheet = resultToSheet(model.query({ groupBy: ['Region[Group]'], values: ['Total Sales', 'Orders'], totals: true }), 'By group');
const bytes = buildXlsx([sheet]); // new Blob([bytes], { type: XLSX_MIME }) to download
return { columns: sheet.columns, rows: sheet.rows, bytes: bytes.length };
\`\`\`

## Bookmarks

A bookmark captures the current page, report and page filters, every slicer, the selection and drill states.

\`\`\`ts
const bm = report.captureBookmark('West, last 6 months');
report.applyBookmark(bm);                 // or by name
report.bookmarkList();
report.on('bookmarkApplied', (e) => ...);
\`\`\`

Bookmarks are included in \`report.toJSON()\`.

## Programmatic control

\`\`\`ts
report.goToPage('Details');
report.setReportFilters([{ target: 'Date[Year]', op: 'eq', value: 2025 }]);
report.setPageFilters('overview', [{ target: 'Products[Category]', op: 'notIn', values: ['Accessories'] }]);
report.setVisualFilters('top-products', [{ target: 'Products[Name]', op: 'topN', n: 10, by: 'Total Sales' }]);
report.getFilters();          // { report, page, slicers }
report.clearSelection();
report.reset();               // clear slicers, selection and drill on the current page
\`\`\`

## Keyboard

Everything that works with a mouse also works from the keyboard:

| Where | Keys |
|---|---|
| Data points | Each visual is one Tab stop: the last data point you focused, or the first. Arrow keys move between points, and Home / End jump to the ends. Enter or Space selects (Ctrl adds to the selection). Shift+F10 or the context-menu key opens the right-click menu. |
| Context menu | Up / Down, Home / End, Enter. Escape or Tab closes it, and focus goes back to the data point. |
| Page tabs | One Tab stop (the current page). Left / Right, Home / End switch pages. |
| Report | Escape clears the selection, or leaves focus mode. |
| Table headers | Enter or Space sorts. |
| Edit mode | Focus a visual to select it. Arrow keys move it one grid cell (with the rest of the selection), and Shift+arrows resize it. |

Data points show their tooltip on focus, and every chart has a plain-language description for screen readers (see \`describe()\`).

## Events

| Event | Payload |
|---|---|
| \`selectionChanged\` | \`{ pageId, visualId, identities, filters }\` |
| \`filtersChanged\` | \`{ pageId, scope: 'report'\\|'page'\\|'visual'\\|'slicer', visualId?, filters }\` |
| \`dataPointClick\` | \`{ visualId, keys, identity, event }\` |
| \`drill\` | \`{ visualId, level, path }\` |
| \`pageChanged\` | \`{ pageId, name }\` |
| \`rendered\` | \`{ visualId, ms }\` |
| \`error\` | \`{ visualId, error }\` |
| \`drillThrough\` | \`{ fromPageId, toPageId, visualId?, filters }\` |
| \`themeChanged\`, \`bookmarkApplied\` | \`{ name }\` |

\`\`\`ts
const off = report.on('dataPointClick', ({ keys }) => router.push(\`/category/\${keys[0]}\`));
off();
\`\`\`

## Usage analytics

\`onUsage\` gets one record per page view (including the first) and per interaction, ready for any analytics sink:

\`\`\`ts
new Report(el, { model, pages, onUsage: (e) => analytics.track(e.type, e) });
// { type: 'interaction', action: 'filter', report: 'Sales', pageId, page: 'Overview', visualId: 'region', at, detail: { scope, filters } }
\`\`\`

Actions are \`select\`, \`drill\`, \`drillThrough\`, \`filter\` and \`bookmark\`. A handler that throws is logged and doesn't break the report.

## Conditional visibility

\`visibleWhen\` shows a visual only when a condition holds. It's evaluated against the filters reaching that visual (slicers, selections, page and report filters), so it updates as viewers interact:

\`\`\`ts
{ type: 'table', fields: { /* … */ }, visibleWhen: { field: 'Product[Category]' } }                 // once a category is picked
{ type: 'card', fields: { /* … */ }, visibleWhen: { field: 'Region[Country]', is: ['Canada'] } }   // only for Canada
{ type: 'textbox', format: { /* … */ }, visibleWhen: { field: 'Product[Category]', is: 'notSelected' } } // a "pick a category" hint
{ type: 'card', fields: { /* … */ }, visibleWhen: { roles: ['Managers'] } }                        // only for an active RLS role
\`\`\`

\`field\` and \`roles\` combine (both must hold). Hidden visuals don't run queries. In edit mode every visual stays visible, so authors can still lay them out. \`report.isVisualVisible(id)\` tells you the current state.

## Try it

A slicer and two charts that filter each other. Click a bar or pick a year:

\`\`\`js playground
import { Report } from '@prismbi/prismbi';

const report = new Report(el, {
  model,
  chrome: { toolbar: false },
  pages: [{
    name: 'Sales',
    visuals: [
      { id: 'year', type: 'slicer', layout: { x: 0, y: 0, w: 3, h: 6 }, fields: { field: 'Date[Year]' } },
      { id: 'cat', type: 'clusteredBar', title: 'By category', layout: { x: 3, y: 0, w: 9, h: 6 }, fields: { category: 'Product[Category]', values: 'Total Sales' } },
      { id: 'trend', type: 'line', title: 'By month', layout: { x: 0, y: 6, w: 12, h: 6 }, fields: { category: 'Date[MonthYear]', values: 'Total Sales' } },
    ],
  }],
});
report.on('selectionChanged', (e) => console.log('filters', e.filters));
return report;
\`\`\`

On the docs site (\`npm run docs\`), **▶ Run in playground** opens it in an editor next to its output.
`,qe="# Performance and scale\n\nPrismBI keeps everything in the browser. This guide covers how the engine handles large tables, what to expect at a million rows, and how to move work off the main thread.\n\nTry it with `npm run dev`, then open `/perf.html`. That page generates 100k to 1M rows, prints cold query timings, and runs a simulated live feed into the model.\n\n## What the engine does for you\n\n- **Columnar storage with typed views.** Each column is a plain array. On demand, the engine also builds a `Float64Array` view (numbers, dates as milliseconds) and a dictionary encoding (`Int32Array` codes + distinct values). Both are cached until the table changes.\n- **Vectorised aggregations.** `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA` and `DISTINCTCOUNT` over a column run as tight loops over those views.\n- **Single-pass grouped queries.** A visual whose measures are built from those aggregations, `COUNTROWS` and compiled `SUMX` / `AVERAGEX` (below) is answered in one pass over the fact rows. Measures may combine them with `+ - * /` and `DIVIDE`, reference other such measures, and wrap them in `CALCULATE` with column filters (`Product[Category] = \"Bikes\"`, `IN` lists, comparisons, `KEEPFILTERS`, nested filters). Each filter is evaluated once into a lookup over the column's dictionary codes, so it costs about two array reads per row; a `CALCULATE` measure grouped by product × country at 1M rows dropped from about 3.1 s to 0.26 s. This replaces evaluating every group separately. Group columns may be on the fact table or on dimensions reached through many-to-one relationships.\n  - **Fallback:** anything else (time intelligence, `CALCULATE` with `ALL` or table filters, `CALCULATE` filtering a column the query also groups or filters by, other iterators, calculation groups in play, `USERELATIONSHIP`, `includeEmpty`) uses the general engine, so results never change.\n  - **When it applies:** in `'auto'` mode it is used for multi-column groupings and for single columns with more than 1,000 values. Below that, indexed per-group evaluation is already faster.\n  - **Toggle:** use `setFastQuery('always' | 'off' | 'auto')` to compare the two paths.\n- **Compiled row expressions.** Iterators (`SUMX`, `AVERAGEX`, `MINX`, `MAXX`, `COUNTX`, `RANKX`…) and calculated columns compile their row expression to a closure over the typed views when it only uses numbers, number columns of the iterated table, `RELATED` (or bare references) to number columns of related tables, unary minus, `+ - * /` and `DIVIDE`. BLANK handling matches the interpreter exactly. `SUMX(Sales, Sales[Quantity] * RELATED(Product[Price]))` over 300k rows drops from about 0.5 s to 40 ms. Anything else, such as measures, variables, text or dates in the row expression, runs in the interpreter, as does everything when `setFastQuery('off')` is set.\n- **Relationship maps.** `RELATED`, cross-table filters and grouping by a dimension use a cached `Int32Array` from each fact row to its related row, built once per table pair from the foreign key's dictionary codes.\n- **Per-dimension pre-aggregation.** Time intelligence and running totals evaluate the same measure once per day or period, each time with a different set of dates but otherwise identical filters. After a filter split repeats, the engine sums the fact column once per dimension row (per date, per product…). Each evaluation then adds up the visible rows' partials instead of scanning the fact table. This applies to `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT` and `COUNTA` through a direct many-to-one relationship with no bidirectional filtering, and only when the dimension filters leave at least 16 rows visible.\n- **Bitmap indexes.** Low-cardinality columns of large tables (at most 512 values, at least 4,096 rows) also get one bitset per value. Filters on them combine with word-wide OR (within a filter) and AND (across filters and relationships) before row lists are built. At 1M rows, that is 2–4× faster for stacked filters such as channel × priority × country (`npm run bench`). `setBitmapIndexes(false)` turns them off.\n- **Hash indexes and caches.** `eq`/`in` filters use column indexes. Visible row sets are cached per filter context and measure results per (measure, context). Visuals re-query only when their own filters change.\n- **Streaming without rebuilds.** `appendRows` extends the numeric views, dictionaries, indexes and bitmaps for the new rows, and a `maxRows` window shifts them, instead of rebuilding them from scratch. The change notification names the tables whose rows changed (`model.onChange((change) => change?.tables)`), and reports re-query only the visuals that can see those tables. A visual can see a table when its fields, filters, format or measures reference it (directly, or through other measures or calculation items), or when it is connected to one of those through a relationship. Definition changes, and any change while row-level security is active, still refresh every visual.\n- **Numeric group keys.** Multi-column groupings key their groups by a mixed-radix number over the column dictionaries, with a dense lookup table for up to 4M combinations, instead of building a string per row.\n\n## Numbers\n\n`npm run bench` generates a star schema and times each query cold, with caches cleared before each run. The schema is a fact table, 400 products, 40 regions and a two-year calendar. The query filters to one year, about half the rows. Timings are from Node 22 on a laptop:\n\n| Query | 200k rows | 1M rows |\n|---|---|---|\n| Category × sales and average order value (12 groups) | 42 ms | 192 ms |\n| Product × region, 16k groups | 57 ms (per-group engine: 10.1 s) | 156 ms |\n| Day × sales, 365 groups | 8 ms | 11 ms |\n| Day × YTD (time intelligence) | 121 ms (scan path: 0.65 s) | 193 ms (scan path: 2.8 s) |\n\nGenerating and loading 1M rows takes about 0.75 s. Warm queries (same filters again) come from the caches in well under a millisecond.\n\nPre-aggregated results can differ from a row-by-row scan in the last floating-point digits, because the same values are added in a different order. Displayed values are unaffected.\n\n## Rendering at scale\n\n![The scale demo: 250,000 rows, a dense line chart, 8,000 scatter points and a virtualized table](../images/performance.png)\n\n- **Lines and areas** with more points than about two per pixel are thinned with Largest-Triangle-Three-Buckets for drawing. Peaks and gaps survive. The crosshair and tooltips still read every point. Stacked areas are drawn in full so the layers meet.\n- **Scatter charts** with more than 3,000 points paint on a canvas laid over the SVG axes. A spatial grid finds the point under the pointer, so tooltips, click to select and cross-filter, the context menu and drill keep working. From 50,000 points they draw with WebGL (one draw call of anti-aliased point sprites) when the browser supports it, falling back to canvas. Without canvas support, for example in SSR or jsdom, they fall back to SVG. `format.scatter.renderer: 'auto' | 'svg' | 'canvas' | 'webgl'` forces one. Image exports embed the canvas pixels.\n- **Off-screen visuals** wait. When filters, selections or data change, visuals more than 300 px outside the viewport skip their re-render until they are scrolled into view (an `IntersectionObserver`). `report.flush()` and exports still render everything.\n- **Tables** with more than 500 rows render only the rows in view, plus a margin, between spacer rows. Sorting, selection and banding behave as before. `format.table.virtualize` forces windowing on or off, and wrapping text turns it off because rows then vary in height.\n\n## Off the main thread\n\n`@prismbi/prismbi/worker` (about 1.3 KB) runs the model in a Web Worker. Build or load the model inside the worker, then talk to it from the page:\n\n```ts\n// model.worker.ts\nimport { serveModel } from '@prismbi/prismbi/worker';\nimport { loadCsv } from '@prismbi/prismbi/connectors';\nimport { DataModel } from '@prismbi/prismbi/core';\n\nconst model = new DataModel().addTable('Sales', await loadCsv('/sales.csv')).addMeasure('Total', 'SUM(Sales[Amount])');\nserveModel(model);\n```\n\n```ts\n// main thread\nimport { createWorkerEngine } from '@prismbi/prismbi/worker';\n\nconst engine = createWorkerEngine(new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' }));\nconst ctrl = new AbortController();\nconst result = await engine.query({ groupBy: ['Sales[Region]'], values: ['Total'] }, ctrl.signal);\n```\n\nThe engine API is asynchronous, and every method returns a promise:\n\n| Method | Does |\n|---|---|\n| `query(spec, signal?)` | Runs a `QuerySpec` and returns rows and totals. |\n| `evaluate(expression, filters?, signal?)` | Evaluates a scalar expression. |\n| `evaluateTable(expression, filters?, signal?)` | Evaluates a table expression (DAX `EVALUATE`). |\n| `addTable(name, rows, schema?)`, `refreshTable(...)`, `appendRows(name, rows, options?)` | Changes table data. |\n| `addMeasure(def)` | Adds a measure. |\n| `setRoles(roles, options?)` | Switches row-level security roles. |\n| `metadata()` | Returns tables, columns, measures and relationships, without rows. |\n| `dispose()` | Stops the engine and terminates the worker. |\n\nFilters must be filter specs (`{ target, op, value }`), because compiled filters can't be copied to another thread. Requests run in order. Aborting a request rejects it at once with an `AbortError`, and the worker skips it if it hasn't started.\n\n`createLocalEngine(model)` has the same API on the current thread, for tests, server rendering or small models.\n\n### Reports on the worker\n\nPass the engine to a report and every visual query runs in the worker:\n\n```ts\nconst report = new Report(el, { model, engine, pages });\n```\n\nVisuals render asynchronously. On first load a visual shows a shimmer. After that, a re-query keeps the previous result on screen, dimmed, until the new one arrives, and superseded queries are cancelled.\n\nSlicers and queries without measures still run on `model` on the page, so slicer tiles appear instantly. The page also uses `model` for metadata: field lists, slicer domains, colours.\n\nKeep the two models in step. Build both from the same code, and apply live rows to both: `model.appendRows(...)` plus `engine.appendRows(...)`. The `/perf.html` demo has a \"Queries in a Web Worker\" switch that does exactly this.\n\n## Tips\n\n- Keep fact tables narrow and put descriptive text on dimensions. Group by dimension columns and let relationships do the work.\n- Prefer measures built from the vectorised aggregations, such as `DIVIDE([Sales], [Orders])`, over `SUMX` row iterators when the result is the same.\n- For live feeds, use `streamInto(…, { maxRows, intervalMs })`. The sliding window bounds memory, and batching bounds re-renders.\n- Calculated columns that read only their own row are cheap to maintain under `appendRows`. Ones that aggregate are recomputed on every append.\n",_e=`# Plugins: signed visuals, themes and connectors

\`@prismbi/prismbi/plugins\` loads extensions at runtime, from your own server or a catalog. Code only runs after two checks pass:
- **Integrity:** the code's SHA-256 hash must match the hash in its manifest.
- **Signature:** the manifest must be signed (ECDSA P-256) by a key you trust.

Both checks use WebCrypto, so they work in browsers, workers and Node 20+.

\`\`\`ts
import { loadPlugin } from '@prismbi/prismbi/plugins';

const plugin = await loadPlugin('https://plugins.example.com/sankey-pro/manifest.json', {
  trustedKeys: { acme: acmePublicJwk },
});
plugin.registered; // { visuals: ['sankeyPro'], themes: [], connectors: [] }
\`\`\`

Failures throw before any plugin code runs:
- the integrity hash doesn't match
- the signature is invalid
- the key is untrusted
- the plugin is unsigned, unless you pass \`allowUnsigned: true\`

## Writing a plugin

A plugin is a **self-contained ES module**: bundle its dependencies, because it's imported from a blob or data URL where bare imports can't resolve. Its default export can contain:

\`\`\`js
export default {
  visuals: [{ type: 'sankeyPro', displayName: 'Sankey Pro', category: 'chart', roles: [/* … */], render(ctx) { /* … */ } }],
  themes: [{ name: 'acme', /* Theme tokens */ }],
  connectors: { loadAcmeCrm: async (opts) => rows },
  register(api) { /* api.registerVisual, api.registerTheme */ },
};
\`\`\`

Visuals follow the same contract as [custom visuals](custom-visuals.md). Write them as plain objects; \`defineVisual\` is only a typing helper.

## Manifest and signing

\`\`\`json
{
  "name": "sankey-pro",
  "version": "1.2.0",
  "kind": "visual",
  "entry": "dist/index.js",
  "displayName": "Sankey Pro",
  "description": "Multi-level flows",
  "author": "Acme"
}
\`\`\`

\`\`\`bash
npx prismbi-sign-plugin keygen keys/                               # keys/private.jwk (secret), keys/public.jwk (share)
npx prismbi-sign-plugin sign manifest.json keys/private.jwk acme   # adds integrity, keyId and signature
\`\`\`

- **What the signature covers:** the plugin's name, version, kind and integrity hash. Changing the code or relabelling the version invalidates it.
- **In code:** \`generateSigningKeys\`, \`signPlugin\`, \`verifyPlugin\` and \`integrityOf\` do the same steps programmatically.

## Catalogs (marketplace)

A catalog is a JSON file that lists plugins with their manifest URLs:

\`\`\`json
{ "name": "Acme plugins", "plugins": [{ "name": "sankey-pro", "version": "1.2.0", "kind": "visual", "manifest": "sankey-pro/manifest.json", "description": "Multi-level flows", "author": "Acme" }] }
\`\`\`

\`\`\`ts
const catalog = await fetchCatalog('https://plugins.example.com/catalog.json');
renderPluginGallery(panel, catalog, { trustedKeys, onInstalled: (p) => console.log(p.registered) });
\`\`\`

\`renderPluginGallery\` renders a list with **Install** buttons; installed plugins show as installed. \`loadedPlugins()\` lists everything loaded in the page.
`,We=`# Importing Power BI projects

\`@prismbi/prismbi/powerbi\` reads a Power BI project saved as \`.pbip\` and turns it into a PrismBI model and report. To get one, use **File › Save as › Power BI project** in Power BI Desktop.

\`\`\`ts
import { importPowerBI } from '@prismbi/prismbi/powerbi';
import { loadCsv } from '@prismbi/prismbi/connectors';

const { model, report, warnings } = importPowerBI(files, {
  data: { Sales: await loadCsv('/data/sales.csv'), Product: await loadCsv('/data/product.csv') },
});
new Report(el, { model, ...report });
console.warn(warnings); // everything that could not be imported, in plain language
\`\`\`

\`files\` maps paths inside the project folder to their text, for example \`{ 'Shop.SemanticModel/definition/tables/Sales.tmdl': '…', 'Shop.Report/definition/pages/…/visual.json': '…' }\`. In Node, read the folder recursively; in a browser, use a folder picker.

## What comes across

| Part | Imported |
|---|---|
| Semantic model (TMDL, or \`model.bim\` in older projects) | tables and typed columns, hidden flags, formats, display folders, descriptions; calculated columns and calculated tables; measures (single-line, multi-line and fenced DAX); relationships (active or inactive, single or both directions); calculation groups with their items, ordinals, precedence and format strings (static or dynamic) |
| Report (PBIR folder format, or legacy \`report.json\`) | pages in order, hidden pages, visuals with their fields, titles and positions (converted to the 12-column grid) |
| Visuals | column, bar and 100% variants, line, area, stacked area, combo, ribbon, waterfall, pie, donut, treemap, funnel, scatter, card, multi-row card, KPI, gauge, table, matrix, slicer, map, filled map, decomposition tree, text box |

- **Data:** projects don't contain rows. Pass rows per table in \`data\`, from CSV, REST, SQL or any connector. Tables without data are created empty with their typed columns, so the model and report still load.
- **Not imported:**
  - Power Query (M) steps; rebuild them as [transforms](transforms.md) if needed
  - visual formatting beyond titles, bookmarks and filters
  - custom visuals
  - DAX functions PrismBI doesn't support
- **Warnings:** each gap appears in \`warnings\`. Measures with unsupported functions are still added so you can fix them.

## Command line

\`\`\`bash
npx @prismbi/prismbi pbip ./Shop report.json
# 2 tables, 4 measures, 1 relationships, 3 pages, 11 visuals → report.json
#   ! Visual "a1b2" of type someCustomVisual is not supported and was skipped
\`\`\`

The command converts the report and prints a compatibility summary. It's a quick way to check how much of a project PrismBI can run.

## Lower-level pieces

- **\`parseTmdl(texts)\` and \`parseModelBim(json)\`:** return the semantic model as plain objects (\`PbiModel\`).
- **\`buildModelFrom(pbiModel, { data, model })\`:** builds or extends a \`DataModel\`.
- **\`mapPbirReport(files)\` and \`mapLegacyReport(json)\`:** return a \`ReportDefinition\`.
`,Xe="# React\n\n```tsx\nimport { PrismReport, PrismVisual, usePrismReport } from '@prismbi/prismbi/react';\n```\n\nReact 17+ is an optional peer dependency. The bindings are about 1 KB, and the core does the work.\n\n## `<PrismReport>`\n\n```tsx\nconst definition = useMemo(() => ({ pages: [...] }), []); // stable identity!\n\nexport function Dashboard() {\n  const ref = usePrismReport();\n  const [theme, setTheme] = useState<'light' | 'dark'>('light');\n\n  return (\n    <>\n      <button onClick={() => ref.current?.goToPage('Details')}>Details</button>\n      <PrismReport\n        ref={ref}\n        model={model}\n        definition={definition}\n        theme={theme}\n        chrome={{ filterPane: true }}\n        filters={[{ target: 'Date[Year]', op: 'eq', value: 2025 }]}  // controlled report filters\n        onSelectionChanged={(e) => console.log(e.filters)}\n        onDataPointClick={(e) => navigate(`/category/${e.keys[0]}`)}\n        style={{ height: 720 }}\n      />\n    </>\n  );\n}\n```\n\n| Prop | Behaviour |\n|---|---|\n| `model`, `definition`, `locale`, `chrome` | A change of identity rebuilds the report, so memoise them |\n| `theme` | Applied incrementally (no rebuild) |\n| `page` | Controlled page (id or name) |\n| `filters` | Controlled report-level filters |\n| `onSelectionChanged`, `onFiltersChanged`, `onPageChanged`, `onDataPointClick`, `onDrill`, `onError`, `onRendered` | Event callbacks. Always the latest closure, with no resubscribe |\n| `ref` | The imperative [`Report`](interactions.md#programmatic-control) instance |\n\n## `<PrismVisual>`\n\nA single visual you can place anywhere, without the toolbar, tabs or pane:\n\n```tsx\n<PrismVisual\n  model={model}\n  type=\"clusteredBar\"\n  title=\"Top products\"\n  fields={{ category: 'Products[Name]', values: 'Total Sales' }}\n  top={10}\n  format={{ dataLabels: { show: true } }}\n  filters={[{ target: 'Region[Name]', op: 'eq', value: region }]}\n  style={{ height: 360 }}\n/>\n```\n\nSpec props (`type`, `fields`, `filters`, `format`, `sort`, `top`, `interaction`) update in place.\n\n## SSR / Next.js\n\nReports need the DOM, so render them on the client: `'use client'` in Next.js, or `dynamic(() => import(...), { ssr: false })`. The model and DAX engine run anywhere, so you can call `model.query()` in server components or API routes.\n",Ye="# Server: headless rendering, alerts and schedules\n\n`@prismbi/prismbi/server` runs on Node (or any runtime) to render visuals and report pages without a browser, watch measures for alerts, and schedule report jobs. Rendering needs a DOM implementation you bring yourself, such as jsdom, linkedom or happy-dom. PrismBI itself adds no dependency.\n\n```ts\nimport { JSDOM } from 'jsdom';\nimport { renderVisualSvg, renderReportHtml, watchMeasure, scheduleReport } from '@prismbi/prismbi/server';\n\nconst { window } = new JSDOM();\n```\n\n## Rendering\n\n```ts\nconst svg = renderVisualSvg(model, { type: 'line', fields: { category: 'Date[MonthYear]', values: 'Total Sales' } }, { window, width: 640, height: 360 });\nconst html = renderReportHtml(model, reportDefinition, { window, page: 'Overview', width: 1280, theme: 'light' });\n```\n\n- **`renderVisualSvg`:** charts come out as their own vector `<svg>`. HTML visuals (cards, tables, slicers) are wrapped in a `foreignObject` together with the report styles. A visual that fails to render throws an error with its message.\n- **`renderReportHtml`:** returns a self-contained HTML document with styles inlined and no scripts. Visuals are absolutely positioned from the page's grid layout at the width you pass. Use it for archives and HTML email bodies, or open it in any headless browser to produce PDF or PNG.\n- **`withDom(window, fn)`:** installs the DOM globals for the duration of `fn`, then restores them. The renderers call it for you; use it directly to drive other PrismBI APIs headlessly.\n- **`measure` report option:** the renderers size visuals with `ReportOptions.measure`, because a DOM without layout reports widths of 0. You can pass it to your own `Report` too.\n\n## Alerts\n\n```ts\nconst stop = watchMeasure(model, {\n  measure: 'Total Sales',\n  filters: [{ target: 'Region[Country]', op: 'eq', value: 'Canada' }],\n  when: { below: 50_000 },          // or { above: n }, { changeBy: 0.1 } (10%), or (value, previous) => boolean\n  onAlert: (e) => notify(`${e.measure} is ${e.value} (${e.condition})`),\n  debounceMs: 500,                   // batch bursts of streamed rows\n});\n```\n\n- **When it checks:** it re-evaluates whenever the model changes, so it reacts to `streamInto`, `scheduleRefresh` and `appendRows`.\n- **Thresholds are edge-triggered:** one alert per crossing. A value that already starts past the threshold doesn't alert until it crosses again.\n- **`changeBy`** compares against the value at the last alert.\n\n## Schedules\n\n```ts\nscheduleReport({\n  every: 'daily@08:00',             // or milliseconds\n  run: async () => {\n    const html = renderReportHtml(model, report, { window });\n    await mailer.sendMail({ to: 'team@example.com', subject: 'Daily sales', html });\n  },\n  onError: console.error,\n});\n```\n\n- **Overlapping runs are skipped.**\n- **Delivery is yours:** use nodemailer, Slack webhooks, object storage, or anything else.\n- **`msUntilDaily('08:00')`** tells you when the next daily run is due.\n\n## Subscriptions and alerts from the report\n\nAuthors define scheduled sends and alerts in the Studio (**⏰ Schedules**), or in the report definition:\n\n![The Studio Schedules dialog: scheduled sends and measure alerts](../images/studio-schedules.png)\n\n```ts\n{ pages: [/* … */],\n  subscriptions: [{ id: 's1', name: 'Daily summary', page: 'overview', schedule: 'daily@08:00', recipients: ['team@example.com'] }],\n  alerts: [{ id: 'a1', name: 'Sales drop', measure: 'Total Sales', when: { below: 1_000_000 }, recipients: ['ops@example.com'] }] }\n```\n\nRun them on a server with your delivery code:\n\n```ts\nconst stopSends = runSubscriptions(model, report, { window, send: (sub, html) => mailer.sendMail({ to: sub.recipients, subject: sub.name, html }) });\nconst stopAlerts = watchAlerts(model, report, (alert, e) => notifyChannel(alert.recipients, `${alert.name}: ${e.value}`));\n```\n\n- **Anomaly alerts:** `when: { anomaly: true }` (optional `kinds`) alerts on unusual spikes and dips found by the insights engine. The event carries `insight: { kind, title, detail }`, and `condition` is the insight's title. These run with `watchAlerts`. The Studio's live preview covers threshold alerts only.\n- **Disabled entries:** `enabled: false` skips a subscription or alert.\n- **Live data:** alerts re-evaluate on every model change.\n- **Studio preview:** alerts fire as notifications while editing, so authors can check their thresholds.\n",He="# SQL pushdown: DuckDB, Postgres and SQLite\n\n`@prismbi/prismbi/sql` translates visual queries into SQL and runs them in a database. Large fact tables stay in DuckDB (DuckDB-Wasm in the browser, or DuckDB, Postgres or SQLite on a server) instead of being loaded into memory. The report doesn't change: pass the engine as `ReportOptions.engine`.\n\n```ts\nimport * as duckdb from '@duckdb/duckdb-wasm';\nimport { DataModel, Report } from '@prismbi/prismbi';\nimport { sqlEngine, duckdbRunner } from '@prismbi/prismbi/sql';\n\n// the model keeps the schema, relationships and measures; dimensions can keep their rows (slicers read them)\nconst model = new DataModel()\n  .addTable('Sales', [], { OrderDate: { type: 'date' }, ProductKey: { type: 'number' }, SalesAmount: { type: 'number' }, OrderNumber: { type: 'string' } })\n  .addTable('Product', products)\n  .addDateTable('Date', '2020-01-01', '2026-12-31')\n  .addRelationship({ from: 'Sales[ProductKey]', to: 'Product[ProductKey]' })\n  .addRelationship({ from: 'Sales[OrderDate]', to: 'Date[Date]' })\n  .addMeasure('Total Sales', 'SUM(Sales[SalesAmount])', { format: '$#,0' })\n  .addMeasure('Orders', 'DISTINCTCOUNT(Sales[OrderNumber])');\n\nconst conn = await db.connect(); // an AsyncDuckDB with the tables loaded (Parquet, CSV, Arrow…)\nconst engine = sqlEngine(model, { run: duckdbRunner(conn) });\nnew Report(el, { model, engine, pages });\n```\n\n- **Other databases:** `run` is any `(sql, signal) => Promise<rows>`, so you can send the SQL to your own server for Postgres, DuckDB or SQLite. Set `dialect: 'postgres' | 'sqlite'` (default `'duckdb'`).\n- **Different names:** `tables` maps model tables to SQL tables or views (`{ Sales: 'analytics.fact_sales' }`). `columns` maps column names per table (`{ Sales: { SalesAmount: 'amount' } }`).\n- **Logging:** `onSql` sees every statement. `engine.toSql(spec)` and `toSql(model, spec, opts)` return the SQL without running it.\n\n## What is pushed down\n\n| Part of the query | SQL |\n|---|---|\n| Grouping columns, on the fact table or along many-to-one relationships | `LEFT JOIN`s from the fact table, `GROUP BY` |\n| Filters: `eq`, `in`, `notIn`, comparisons, `between`, text matching, blanks, multi-column `tuples` | `WHERE` (blank-aware like the in-memory engine) |\n| Top N filters | an `IN (SELECT … ORDER BY … LIMIT n)` subquery |\n| `orderBy`, `top`, `limit`, sort-by columns (month names in calendar order) | `ORDER BY … NULLS LAST`, `LIMIT` |\n| `totals`, `highlight` | extra statements, run in parallel |\n| Visual calculations | applied to the SQL result, as in memory |\n| `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `DISTINCTCOUNT`, `COUNTROWS(fact)`, `MEDIAN` (DuckDB) | aggregates; empty counts are blank, as in DAX |\n| `SUMX`, `AVERAGEX`, `MINX`, `MAXX` over the fact table, with arithmetic and `RELATED` | aggregates of row expressions |\n| Measure references, `VAR`, arithmetic (BLANK + 5 = 5), `DIVIDE`, `IF`, `ISBLANK`, `COALESCE`, `ABS`, `ROUND`, comparisons | inlined expressions |\n| `CALCULATE` with column comparisons and `IN` lists (and `KEEPFILTERS`) | `FILTER (WHERE …)` on the aggregates |\n| Calculated columns with row arithmetic (e.g. `Sales[Amount] - Sales[Cost]`) | inlined; map others (and date columns) to real database columns in `columns` |\n\n## Filter-context mode\n\nQueries that a single `GROUP BY` can't answer switch to filter-context mode automatically (`toSql(...).mode` says which one ran). Each aggregate becomes a correlated subquery over its own table, carrying the DAX filter context at that point:\n\n| DAX | In filter-context mode |\n|---|---|\n| `CALCULATE` filters that replace a filter the query also uses (and `KEEPFILTERS` to intersect) | the column's filter is replaced |\n| `ALL`, `REMOVEFILTERS`, `ALLSELECTED`, `ALLEXCEPT` | filters removed or restored to the query's own |\n| `FILTER(ALL(Date[Date]), Date[Date] <= MAX(Date[Date]))` and other row conditions | row predicates; aggregates inside see the outer context |\n| `SAMEPERIODLASTYEAR`, `DATEADD`, `DATESYTD` / `QTD` / `MTD`, `TOTALYTD` / `QTD` / `MTD`, `PREVIOUSYEAR` / `QUARTER` / `MONTH`, `DATESBETWEEN` | date ranges derived from the dates in context, with DAX month-end handling (Feb 28, 2025 a year back covers Feb 29, 2024) |\n| A dimension measure by another dimension (`MAX(Product[ListPrice])` by region), `COUNTROWS(Product)`, `COUNTROWS(FILTER(...))`, iterators over `FILTER` | evaluated over their own table, with only the filters that reach it (single-direction relationships) |\n\nFilters reach a table only along its many-to-one relationships, as in DAX. Group combinations follow the in-memory engine: one dimension lists its values, several list the combinations present in the fact table. Results are checked against the in-memory engine on SQLite in the tests. DuckDB and Postgres decorrelate these subqueries well; SQLite is slower, but contiguous date contexts (years, months, ranges) use range checks.\n\nAlso handled in filter-context mode:\n\n- **`USERELATIONSHIP`:** joins along the inactive relationship for that calculation (e.g. sales by ship date).\n- **Measures inside `FILTER` conditions:** `FILTER(VALUES(Product[Name]), [Total Sales] > 400000)` evaluates the measure per row with the row's key as a filter (context transition).\n- **Row-level security:** the active roles' rules become filters on their tables. Roles are unioned per table, as in memory, and `USERNAME()` / `CUSTOMDATA()` resolve to the values passed to `setRoles`. `ALL` and `REMOVEFILTERS` can't remove them.\n\n### Still not pushed down\n\nThese throw a `SqlUnsupportedError` that names the cause:\n\n- `CROSSFILTER` and bidirectional relationships.\n- Compiled row-set filters passed in a query (filter specs work).\n- `MEDIAN` outside DuckDB, and DAX functions without an SQL equivalent.\n\n`fallback: 'model'` answers those queries from the in-memory model instead. That only helps if the model holds the rows it needs, e.g. a summary table.\n\n## Dates\n\nDates are calendar dates. Literals are written from the local date (`DATE '2025-03-01'`, or `'2025-03-01'` for SQLite). `DATE` values that come back, whether as ISO strings, epoch days or UTC-midnight timestamps, become local-midnight `Date`s, the way the model creates them.\n\n## Try it\n\nSee the SQL a visual query becomes:\n\n```js playground\nimport { toSql } from '@prismbi/prismbi/sql';\n\nreturn toSql(model, {\n  groupBy: ['Product[Category]'],\n  values: ['Total Sales', 'Orders'],\n  filters: [{ target: 'Date[Year]', op: 'eq', value: 2025 }],\n  orderBy: [{ field: 'Total Sales', direction: 'desc' }],\n  top: 3,\n}).sql;\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",Ge="# Studio (report editor)\n\n`@prismbi/prismbi/studio` is a drag-and-drop report editor that works like Power BI Desktop, in the browser. End users build and change reports, and the result is a JSON document you store wherever you like.\n\n![PrismBI Studio: field list, canvas, visualizations and build pane](../images/studio.png)\n\n```ts\nimport { Studio } from '@prismbi/prismbi/studio';\n\nconst studio = new Studio(document.getElementById('editor')!, {\n  model,                          // your DataModel\n  storageKey: 'sales-report',     // optional: autosave to localStorage and restore on load\n  // document: savedDoc,          // or open a saved document\n  // starter: 'blank',            // new documents start from a generated page by default\n});\n\nstudio.on('change', (doc) => api.saveDraft(doc));   // every undoable change\nstudio.on('save', (doc) => api.publish(doc));        // Ctrl+S / studio.save()\n```\n\nReact:\n\n```tsx\nimport { PrismStudio } from '@prismbi/prismbi/react';\n<PrismStudio model={model} storageKey=\"sales-report\" onChange={saveDraft} style={{ height: '100vh' }} />\n```\n\nTo show the finished report to viewers, pass `doc.report` to `<PrismReport definition={…}>` or `new Report(el, { model, ...doc.report })`.\n\n## What users can do\n\n| Area | Features |\n|---|---|\n| **Canvas** | Select visuals, drag to move, resize from 8 handles. Everything snaps to the page grid, which is visible while editing. Click empty space to deselect |\n| **Keyboard** | Arrows nudge (Shift+arrows resize) · Delete removes · Ctrl+D duplicates · Ctrl+C / Ctrl+V copy and paste · Ctrl+] / Ctrl+[ front and back · Ctrl+Z / Ctrl+Y undo and redo · Ctrl+S saves · Esc deselects |\n| **Fields pane** | Tables with measures (grouped by display folder), columns and hierarchies, plus search and \"show hidden\". Drag a field onto the canvas, a visual or a well. Click it to add it to the selected visual, or to create a fitting visual. The ⋯ menu edits or deletes measures and studio-created columns, and offers \"New measure: Sum\" for numeric columns |\n| **Build pane** | Visual type picker: changing type keeps your fields. Field wells per data role: drop, reorder by drag, remove, and change aggregation for columns used as values |\n| **Format pane** | Generated from a format schema: general (title, Top N, interaction), size and position, title, legend, data labels, axes (including continuous and log), colors (fixed, per series, gradient, rules), bars, lines, analytics (trend and reference lines), small multiples, tooltip (including report-page tooltips), plus visual-specific sections (card, table, matrix, slicer, map, waterfall …), background, border and header icons. With nothing selected, it shows **page settings** (grid, background, hidden, drill-through fields, tooltip page), the **report name** and the **theme designer** (mode, accent, backgrounds, text, font, radius, 8 data colors) |\n| **Filters pane** | Visual, page and report filters (Basic, Advanced, Top N) |\n| **Pages** | Add, rename (double-click), duplicate, hide, reorder and delete, from the tab bar and its right-click menu. Tooltip and drill-through pages are labelled |\n| **Measures and columns** | Editors with DAX completion, live diagnostics, signature help, a value preview, format presets and display folders. Renaming a measure updates the visuals that use it |\n| **Data view** | Browse every table (types, formats, calculated columns) and add columns or measures |\n| **Model view** | A relationship diagram. Drag tables to arrange them. Drag a column onto another table's column to create a relationship: the side with unique values becomes the one side, otherwise it's many-to-many, and it's inactive when another active path exists. Click a line to switch it active or inactive, change its direction, or delete it |\n| **Auto page** | Generates a starter page from the model: slicers, KPI cards, trend, breakdowns and a detail table (`autoReport(model)`) |\n| **Preview** | Hides the editing chrome so you can try the report as a viewer would (cross-filtering, drill, tooltips) |\n| **Export / Import** | Download or open the document as JSON |\n\n## The document\n\n\n![The Studio model view: tables, columns and relationships](../images/studio-model-view.png)\n```ts\ninterface StudioDocument {\n  version: 1;\n  report: ReportDefinition;      // pages, visuals, filters, bookmarks (schema-versioned)\n  model: StudioModelState;       // measures / columns / relationships added or changed in the studio\n  theme?: Record<string, unknown>; // theme overrides\n  diagram?: Record<string, { x: number; y: number }>; // model view layout\n}\n```\n\nModel changes are stored as a diff against the model the studio was opened with. Your code stays the source of truth for tables and base measures, and opening a document replays the user's additions and edits on top. Undo and redo cover report and model edits alike. Moving tables in the diagram is saved but isn't an undo step.\n\n**Versioning.** `report.version` follows `REPORT_SCHEMA_VERSION`. `migrateReport(json)` upgrades older documents, and newer ones are rejected with a clear message. `Report.parse()` and `report.load()` migrate automatically.\n\n## API\n\n| Member | |\n|---|---|\n| `document` / `load(doc)` / `exportJSON()` / `save()` | Read or open documents. `save()` writes to `storageKey` and emits `save` |\n| `undo()` · `redo()` · `canUndo` · `canRedo` · `isDirty` | History |\n| `addVisual(type, fields?)` · `addField(ref)` · `assign(visualId, ref, role?, index?)` · `setVisualType(type)` · `select(id)` | Build reports from code (each call is one undo step) |\n| `setView('report' \\| 'data' \\| 'model')` · `setPreview(on)` | Views |\n| `editMeasure(name?)` · `editColumn(table?, name?)` | Open the editors |\n| `report` · `model` | The underlying `Report` (edit-mode APIs below) and `DataModel` |\n| `on('change' \\| 'save' \\| 'selection', fn)` | Events |\n\n### Report edit-mode APIs (usable without the studio)\n\n`setEditMode(on)` · `selectedVisual` · `visualFormat(id)` · `findFreeSpot(w, h)` · `duplicateVisual(id)` · `arrange(id, 'front' | 'back')` · `updatePage(id, patch)` · `movePage(id, index)` · `duplicatePage(id)` · `pageDefinition(id?)` · `load(definition)`, plus the events `definitionChanged` and `visualSelected`.\n\n### Building blocks\n\n`assignField`, `retargetFields`, `autoVisualFor`, `defaultSize`, `fieldKind`, `autoReport`, `History`, `sectionsFor` / `COMMON_SECTIONS` / `TYPE_SECTIONS` (the format schema) and `ExpressionEditor` are all exported. You can build a custom editor shell or add your own sections to the format schema.\n\n## DAX copilot\n\n`new Studio(el, { model, copilot: daxCopilot(model) })` (from `@prismbi/prismbi/ai`) adds a plain-English box to the measure editor: **✦ Write DAX** fills in the expression, name and format, and **Explain** describes the current expression. Any object with `write(request)` and an optional `explain(expression)` works, so you can plug in your own service. See [AI](ai.md#dax-copilot).\n\n![The measure editor writing and explaining DAX from plain English](../images/studio-dax-copilot.png)\n\n## Phone layouts\n\nPress **📱 Phone** in the top bar to arrange the current page for phones:\n\n![Editing the phone layout of a page in the Studio](../images/studio-phone.png)\n- **Canvas:** it narrows to phone width with a 4-column grid.\n- **Editing:** dragging and resizing edit the phone layout only; the desktop layout is untouched.\n- **Starting point:** the first time, the page's visuals are stacked in reading order, with small cards paired side by side. **Reset phone layout** regenerates that arrangement.\n\nPhone layouts are saved on the page as `mobile` and used automatically below 640 px:\n\n```ts\n{ id: 'overview', name: 'Overview', visuals: [/* … */],\n  mobile: { columns: 4, visuals: [{ id: 'k-sales', layout: { x: 0, y: 0, w: 2, h: 3 } }, /* … */] } }\n```\n\n| API | Does |\n|---|---|\n| `report.setLayoutMode('auto' \\| 'desktop' \\| 'mobile')` | choose the layout; `'auto'` switches at `mobileBreakpoint` (default 640) |\n| `report.autoMobileLayout(page?)` | (re)generate a page's phone layout |\n| `report.setMobileVisibility(id, visible)` | hide a visual on phones, or bring it back at the bottom |\n| `report.setMobileLayout(id, layout)` | move or resize a visual in the phone layout |\n| `report.isMobileLayout` | whether the phone layout is showing |\n\nVisuals not listed in `mobile.visuals` are hidden on phones. Pages without a phone layout keep the automatic behaviour: below 640 px every visual takes the full width, in order.\n\n## Selecting and arranging several visuals\n\n- **Selecting several:** Ctrl-, Shift- or Cmd-click visuals on the canvas or in **Layers**. Ctrl+A selects every visual on the page.\n- **Moving together:** dragging any selected visual moves the whole selection, kept on the grid, and undoes as one step.\n- **Arrange menu:**\n  - align left, center, right, top, middle or bottom (two or more selected)\n  - distribute horizontally or vertically (three or more)\n  - group (Ctrl+G) and ungroup (Ctrl+Shift+G); grouped visuals select and move together and are marked ⧉ in Layers\n  - bring to front, bring forward, send backward, send to back\n- **Layers:** lists the page front to back. Click to select, use the arrows to reorder.\n\nIn code: `report.selectedVisuals`, `selectVisuals(ids)`, `toggleVisualSelection(id)`, `alignVisuals(how, ids?)`, `distributeVisuals(axis, ids?)`, `groupVisuals(ids?)`, `ungroupVisuals(ids?)`, `arrange(id, 'front' | 'forward' | 'backward' | 'back')` and `commitLayouts(updates)`. All of them work on whichever layout is showing, desktop or phone.\n",Ke="# Theming and formatting\n\n## Built-in themes\n\n`'light'` (the default) and `'dark'`. Both use the same eight-hue categorical palette. Each mode has its own steps, tuned to its surface, and both are validated for colour-vision-deficiency separation.\n\n![The demo report in the dark theme](../images/report-overview-dark.png)\n\n```ts\nnew Report(el, { model, theme: 'dark', pages });\nreport.setTheme('light');\n```\n\n## Custom themes\n\n```ts\nimport { createTheme, registerTheme } from '@prismbi/prismbi';\n\nconst brand = createTheme({\n  name: 'acme',\n  dataColors: ['#0057b8', '#ff8a00', '#00a88f', '#e0b100', '#c03d8a', '#4e9a06', '#6f42c1', '#d7263d'],\n  accent: '#0057b8',\n  fontFamily: '\"Inter\", system-ui, sans-serif',\n  radius: 12,\n  visualStyles: {\n    '*': { border: { show: false }, shadow: { show: true } },          // every visual\n    card: { title: { show: false } },\n    clusteredColumn: { dataLabels: { show: true } },\n  },\n});\nregisterTheme(brand);\nreport.setTheme('acme');\n```\n\nTheme tokens: `dataColors`, `otherColor`, `background` (page), `surface` (visuals), `foreground`, `foregroundSecondary`, `foregroundMuted`, `gridline`, `axis`, `border`, `accent`, `good`, `bad`, `warning`, `neutral`, `sequential[]`, `diverging[3]`, `fontFamily`, `fontSize`, `titleFontSize`, `calloutFontSize`, `labelFontSize`, `radius`, `visualStyles`.\n\n`createTheme({ mode: 'dark', ... })` starts from the dark theme.\n\n**Palette rules worth keeping:** assign categorical colours in a fixed order and never cycle them. Keep `good`, `bad` and `warning` separate from series colours. Run your palette through a colour-vision-deficiency check before shipping it.\n\n## Power BI theme JSON\n\n```ts\nimport { fromPowerBITheme } from '@prismbi/prismbi';\nreport.setTheme(fromPowerBITheme(await (await fetch('/themes/corporate.json')).json()));\n```\n\nThis maps `dataColors`, `background`, `foreground`, `tableAccent`, `good`, `bad` and `neutral`, the divergent colours (`minimum`, `center`, `maximum`), and the `textClasses` fonts and sizes (points → px).\n\n## CSS variables\n\nThemes set CSS custom properties on `.pbi-report`, so you can override them in your own CSS:\n\n```css\n.my-dashboard .pbi-report {\n  --pbi-accent: #7c3aed;\n  --pbi-radius: 4px;\n  --pbi-font: \"IBM Plex Sans\", sans-serif;\n}\n.my-dashboard .pbi-visual[data-type=\"card\"] { --pbi-v-bg: linear-gradient(135deg, #eef2ff, #fff); }\n```\n\nVariables: `--pbi-bg`, `--pbi-surface`, `--pbi-fg`, `--pbi-fg-2`, `--pbi-fg-3`, `--pbi-grid`, `--pbi-axis`, `--pbi-border`, `--pbi-accent`, `--pbi-good`, `--pbi-bad`, `--pbi-warning`, `--pbi-font`, `--pbi-font-size`, `--pbi-title-size`, `--pbi-label-size`, `--pbi-radius`, plus per-visual `--pbi-v-bg`, `--pbi-v-bc`, `--pbi-v-bw`, `--pbi-v-radius`, `--pbi-v-pad`.\n\nEvery element has a stable `pbi-*` class, and each visual container has `data-type` and `data-visual-id` attributes. Use `className` or `style` on a `VisualSpec` for one-off styling.\n\n## Custom tooltips\n\n```ts\nnew Report(el, {\n  model, pages,\n  tooltip: (items, title) => `<b>${title}</b><br>${items.map((i) => `${i.label}: ${i.value}`).join('<br>')}`,\n});\n```\n\nReturn an `HTMLElement` or an HTML string, or `undefined` to use the default tooltip.\n\n## Format strings\n\nFormat strings apply to columns (`schema.format`), measures (`{ format }`), fields (`{ field, format }`) and data labels (`format.dataLabels.format`).\n\n| Pattern | 1234.5 | Notes |\n|---|---|---|\n| `#,0` | 1,235 | grouping |\n| `#,0.00` | 1,234.50 | fixed decimals |\n| `0.0%` | — | `0.256` gives 25.6% |\n| `$#,0` / `€ #,0.0` | $1,235 | literal prefix or suffix (quote other text: `\"units \"#,0`) |\n| `#,0,` | 1 | each trailing comma divides by 1,000 |\n| `0.00E+00` | 1.23E+3 | scientific |\n| `000` | — | `5` gives 005 |\n| presets | | `integer`, `decimal`, `percent`, `currency`, `currencyWhole`, `shortDate`, `longDate`, `monthYear`, `year` |\n\n**Display units:** `displayUnits: 'auto' | 'none' | 'thousands' | 'millions' | 'billions' | 'trillions'` is available on value axes, data labels and cards. `auto` picks the unit from the magnitude and keeps about three significant digits (9.06M, 12.3K).\n\n**Dates:** `yyyy yy MMMM MMM MM M dddd ddd dd d HH H hh h mm ss tt q` plus `\"literal\"`, e.g. `'\"Q\"q yyyy'` gives Q1 2025.\n\n**Locale:** output defaults to `en-US`, so it's identical on every machine and on the server. Set `new Report(el, { locale: 'de-DE' })`, or call `setDefaultLocale('default')` to use the browser's locale.\n\n```ts\nimport { formatValue } from '@prismbi/prismbi';\nformatValue(1500000, '$#,0', { displayUnits: 'auto' }); // \"$1.5M\"\n```\n\n## Accessibility\n\n\n![The high-contrast theme](../images/report-high-contrast.png)\n- **Chart narration.** Every chart gets a plain-language summary, for example: *\"Line chart of Total Sales by MonthYear: 24 values from Jan 2024 to Dec 2025. Highest is Dec 2025 at $1.05M, lowest is Feb 2025 at $450K. Up 113% from first to last.\"*\n  - **Where it goes:** the visual's `aria-description`, plus a visually hidden paragraph for screen readers that don't support it.\n  - **Content:** it follows the current filters and selection.\n  - **In code:** `report.visual(id).describe()` returns the text (useful for alt text and exports), and `narrate(type, result, options)` builds it from any query result.\n  - **Opting out:** `format: { accessibility: { narration: false } }` on a visual.\n  - **Skipped:** tables, slicers and text, which screen readers already read directly.\n- **High-contrast theme.** `theme: 'high-contrast'` puts bright, distinct series colours, white text and strong outlines on black.\n- **Keyboard and structure.**\n  - Marks are focusable, Enter selects, and tooltips follow focus.\n  - Every chart has `role=\"img\"` with its title.\n  - Every visual offers **Show as table**.\n\n## Localization\n\nTranslations travel with the report definition, one entry per locale:\n\n```ts\nnew Report(el, {\n  model,\n  pages,\n  locale: 'fr-CA',                     // also drives number and date formatting\n  translations: {\n    fr: {\n      pages: { overview: 'Aperçu' },\n      visuals: { cols: { title: 'Ventes par catégorie' }, note: { text: 'Bonjour' } },\n      fields: { 'Total Sales': 'Ventes totales', 'Product[Category]': 'Catégorie' },\n    },\n  },\n});\nreport.setLocale('ar-EG');             // switch at runtime\n```\n\n- **Locale matching:** the exact locale is tried first, then its language (`fr-CA` → `fr`). Anything untranslated keeps its original text.\n- **Field names:** these rename axis titles, legends, tooltips and screen-reader narration, without touching the model.\n- **Direction:** Arabic, Hebrew, Persian and Urdu locales switch the report to right-to-left. `direction: 'ltr' | 'rtl'` forces either.\n- **Saving:** `translations` are kept by `toJSON()` and `load()`.\n\n## Try it\n\n```js playground\nimport { createVisual } from '@prismbi/prismbi';\n\nreturn createVisual(el, {\n  model,\n  type: 'donut',\n  title: 'Sales by region group',\n  theme: { dataColors: ['#0f766e', '#f59e0b', '#7c3aed', '#e11d48'] },\n  fields: { legend: 'Region[Group]', values: 'Total Sales' },\n});\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",Qe=`# DAX tooling

These are building blocks for editors, consoles and documentation. They're tree-shaken out of apps that don't import them.

![A DAX console built on the language service: diagnostics, completion and formatting](../images/dax-console.png)

## Language service

\`\`\`ts
import { DaxLanguageService } from '@prismbi/prismbi';

const ls = new DaxLanguageService(model);

ls.complete('SUM(Sales[Am', 12);   // [{ label: 'Amount', kind: 'column', insertText: 'Amount]', from: 10, to: 12, … }]
ls.complete('[Tot', 4);            // measures
ls.complete('CALCU', 5);           // functions (CALCULATE first), tables, keywords, VAR names
ls.hover('[Total Sales]', 3);      // { title: '[Total Sales]', detail: 'Measure · $#,0', documentation: 'SUM(Sales[Amount])' }
ls.signatureHelp('DIVIDE(1, ', 10); // { name: 'DIVIDE', signature: 'DIVIDE(<numerator>, <denominator>, [<alternate>])', activeParameter: 1 }
ls.diagnose('SUM(Sales[Nope])');   // [{ from: 9, to: 15, severity: 'error', message: "Column [Nope] not found in table 'Sales'" }]
ls.format('calculate(sum(Sales[Amount]),Products[Color]="Red")');
\`\`\`

All positions are character offsets, so you can map them to CodeMirror, Monaco or a plain \`<textarea>\`. The demo's **DAX console** (\`examples/console.ts\`) is a complete textarea-based example in about 150 lines.

Diagnostics cover:
- syntax errors, with their position
- unknown functions, tables, columns, measures and variables

## Formatter

\`\`\`ts
import { formatDax } from '@prismbi/prismbi';
formatDax('VAR a=1 VAR b=2 RETURN a+b');
// VAR a = 1
// VAR b = 2
// RETURN
//     a + b
formatDax(longExpression, { indent: '  ', maxLine: 100 });
\`\`\`

The formatter adds parentheses only where precedence needs them, keeps spacing consistent, and breaks calls that run past \`maxLine\` onto one argument per line.

## Dependency explanation

\`\`\`ts
import { explainDax } from '@prismbi/prismbi';
explainDax(model, '[Margin %]');
// { formatted, functions: ['DIVIDE', 'SUM'], measures: ['Total Sales', 'Total Cost', 'Profit', 'Margin %'],
//   columns: ['Sales[Amount]', 'Sales[Cost]'], tables: ['Sales'] }
\`\`\`

Use it for lineage views, impact analysis ("what breaks if I rename this column?") or documentation.

## Function catalog

\`DAX_FUNCTIONS\` lists every supported function with its signature, description and category, and \`DAX_KEYWORDS\` lists the bare keywords (intervals, sort orders, directions, types). A test checks that every catalogued function is implemented.

## Lineage, impact and safe renames

\`\`\`ts
import { lineage, impactOf, renameModelField } from '@prismbi/prismbi';

const graph = lineage(model, report.toJSON());          // nodes (tables, columns, measures, visuals) and "uses" edges
const impact = impactOf(model, { kind: 'column', table: 'Sales', name: 'Amount' }, report.toJSON());
// { measures: ['Total Sales', 'Margin %', …], columns: ['Sales[Profit]'], visuals: [{ pageName, visualId, title }, …] }

const { report: updated } = renameModelField(model, { kind: 'measure', name: 'Total Sales' }, 'Revenue', report.toJSON());
report.load(updated!);
\`\`\`

- **Impact:** \`impactOf\` follows dependencies transitively, through measures and calculated columns, up to the visuals that would break.
- **Renaming:** \`renameModelField\` renames a measure or column and rewrites the references in other measures, calculated columns, and the report's visual fields and filters.
  - Rewriting works on DAX tokens, so a string like \`"[Total Sales]"\` is never touched.
  - \`Table[Name]\` keeps meaning a column when that table has one.
  - \`model.renameColumn\` renames just the column; relationships follow.
- **In the Studio:** renaming a measure or calculated column in its editor applies all of this automatically. Deleting a measure lists everything that uses it first.
`,ze="# Transforms: clean and reshape data (Power Query-style)\n\nTransform steps are plain objects applied in order to a table's rows. They're stored with the model, so they replay whenever the data is refreshed or appended to, and the same steps run in the browser, a Web Worker or on a server.\n\n```ts\nmodel.transformTable('Sales', [\n  { op: 'removeDuplicates' },\n  { op: 'transformText', columns: ['Customer'], fn: 'clean' },\n  { op: 'changeType', column: 'Amount', type: 'number' },     // \"1,200\" → 1200, \"n/a\" → blank\n  { op: 'filterRows', column: 'Region', test: 'notBlank' },\n  { op: 'splitColumn', column: 'Order', delimiter: '-', into: ['Series', 'Number'] },\n]);\n```\n\nIn the Studio, open the Data view and press **Transform** on a table. You can add steps from a form, reorder or remove them, and watch a live preview of the first rows. The steps are saved in the Studio document and undo like any other edit.\n\n## Steps\n\n\n![The Studio transform editor: steps applied to a table, with a preview](../images/studio-transforms.png)\n| Step | Example |\n|---|---|\n| `filterRows` | `{ op: 'filterRows', column: 'Amount', test: 'gt', value: 100 }`. Tests: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `startsWith`, `in`, `notIn`, `isBlank`, `notBlank` |\n| `removeColumns`, `keepColumns` | `{ op: 'keepColumns', columns: ['Date', 'Amount'] }` |\n| `renameColumns` | `{ op: 'renameColumns', names: { Cust: 'Customer' } }` |\n| `changeType` | `number` (strips `, $ € £ %`), `string`, `date` (ISO dates become local dates), `boolean` |\n| `replaceValues` | `{ op: 'replaceValues', column: 'Region', find: null, replace: 'Unknown' }` |\n| `transformText` | `trim`, `clean` (collapse spaces), `upper`, `lower`, `title` |\n| `splitColumn`, `mergeColumns` | split by a delimiter into named columns; merge with a separator |\n| `addColumn` | `{ op: 'addColumn', name: 'Label', template: '{First} {Last}' }` |\n| `fillDown` | fill blanks with the value above |\n| `unpivot`, `pivot` | columns to attribute/value rows and back (pivot aggregates: `sum`, `count`, `first`, `min`, `max`, `avg`) |\n| `groupBy` | `{ op: 'groupBy', by: ['Region'], aggregations: [{ name: 'Orders', agg: 'count' }, { name: 'Units', column: 'Qty', agg: 'sum' }] }` |\n| `sort`, `removeDuplicates`, `keepTop` | ordering, de-duplication (whole row or chosen columns), first N rows |\n| `merge`, `append` | join (left or inner) or stack another table of the model |\n\n## How replay works\n\n- **Source rows:** the first `transformTable` call keeps the table's current rows, without calculated columns, as the source. `transformTable(name, [])` removes the steps and restores the source.\n- **Refresh:** `refreshTable(name, rows)` treats `rows` as the new source and replays the steps. Calculated columns are recomputed afterwards.\n- **Appends:**\n  - When every step works row by row (filter, rename, type, text, split, merge, add, replace, unpivot, merge-join), only the new rows go through the steps.\n  - Whole-table steps (group, sort, pivot, fill down, remove duplicates, keep top, append) replay over the full source.\n  - `maxRows` windows the source.\n- **Inspecting:** `model.transformsOf(name)` returns the steps, and `model.sourceRowsOf(name)` the source rows. The steps also appear in `model.toJSON().transforms`.\n- **Standalone use:** `applySteps(rows, steps, { lookup })` runs steps without a model, for example in a server job. `describeStep(step)` gives the plain-language label shown in the editor.\n\n## Try it\n\n```js playground\nimport { applySteps } from '@prismbi/prismbi';\n\nreturn applySteps(\n  [\n    { Customer: '  ana lopez ', Q1: 10, Q2: 12 },\n    { Customer: 'ben ito', Q1: 5, Q2: null },\n  ],\n  [\n    { op: 'transformText', columns: ['Customer'], fn: 'clean' },\n    { op: 'transformText', columns: ['Customer'], fn: 'title' },\n    { op: 'unpivot', columns: ['Q1', 'Q2'], attribute: 'Quarter', value: 'Units' },\n  ],\n);\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",Je="# Visuals reference\n\nEvery visual is a `VisualSpec`:\n\n```ts\n{\n  id?: string;                      // stable id (auto-generated otherwise)\n  type: 'clusteredColumn';          // see the table below\n  title?: string;\n  layout?: { x, y, w, h, z? };      // grid units (page default: 12 columns × 44px rows)\n  fields?: { [role]: FieldSpec | FieldSpec[] };\n  filters?: FilterSpec[];           // visual-level filters\n  format?: { ...format pane };      // see \"Common format options\" below\n  sort?: { field: 'Total Sales', direction: 'desc' };\n  top?: number;                     // keep first N groups after sorting\n  interaction?: 'filter' | 'highlight' | 'none';   // how it reacts to other visuals\n  interactionsFrom?: { [sourceVisualId]: 'filter' | 'highlight' | 'none' };\n  drill?: { level, path, skip? };   // persisted drill state\n  hidden?: boolean; className?: string; style?: string;\n}\n```\n\nA `FieldSpec` is one of:\n- a measure name, e.g. `'Total Sales'`\n- a column ref, e.g. `'Products[Category]'`. In a measure role, this gets an implicit aggregation.\n- `{ field: 'Sales[Qty]', aggregation: 'avg', name: 'Avg qty', format: '#,0.0' }`\n- `{ expression: 'SUM(Sales[Amount]) * 1.1', name: 'Forecast', format: '$#,0' }`\n\n## Gallery\n\nEvery built-in visual with the demo data (light theme). The same images back the visual regression tests.\n\n| | | |\n|---|---|---|\n| ![area](../images/visuals/area.png) `area` | ![boxPlot](../images/visuals/boxPlot.png) `boxPlot` | ![bullet](../images/visuals/bullet.png) `bullet` |\n| ![calendar](../images/visuals/calendar.png) `calendar` | ![card](../images/visuals/card.png) `card` | ![clusteredBar](../images/visuals/clusteredBar.png) `clusteredBar` |\n| ![clusteredColumn](../images/visuals/clusteredColumn.png) `clusteredColumn` | ![decompositionTree](../images/visuals/decompositionTree.png) `decompositionTree` | ![donut](../images/visuals/donut.png) `donut` |\n| ![funnel](../images/visuals/funnel.png) `funnel` | ![gauge](../images/visuals/gauge.png) `gauge` | ![heatmap](../images/visuals/heatmap.png) `heatmap` |\n| ![histogram](../images/visuals/histogram.png) `histogram` | ![kpi](../images/visuals/kpi.png) `kpi` | ![line](../images/visuals/line.png) `line` |\n| ![lineClusteredColumn](../images/visuals/lineClusteredColumn.png) `lineClusteredColumn` | ![map](../images/visuals/map.png) `map` | ![matrix](../images/visuals/matrix.png) `matrix` |\n| ![multiRowCard](../images/visuals/multiRowCard.png) `multiRowCard` | ![percentStackedBar](../images/visuals/percentStackedBar.png) `percentStackedBar` | ![percentStackedColumn](../images/visuals/percentStackedColumn.png) `percentStackedColumn` |\n| ![pie](../images/visuals/pie.png) `pie` | ![radar](../images/visuals/radar.png) `radar` | ![ribbon](../images/visuals/ribbon.png) `ribbon` |\n| ![sankey](../images/visuals/sankey.png) `sankey` | ![scatter](../images/visuals/scatter.png) `scatter` | ![scatter-webgl](../images/visuals/scatter-webgl.png) `scatter-webgl` |\n| ![slicer-list](../images/visuals/slicer-list.png) `slicer-list` | ![slicer-range](../images/visuals/slicer-range.png) `slicer-range` | ![slicer-tiles](../images/visuals/slicer-tiles.png) `slicer-tiles` |\n| ![stackedArea](../images/visuals/stackedArea.png) `stackedArea` | ![stackedBar](../images/visuals/stackedBar.png) `stackedBar` | ![stackedColumn](../images/visuals/stackedColumn.png) `stackedColumn` |\n| ![table](../images/visuals/table.png) `table` | ![text](../images/visuals/text.png) `text` | ![treemap](../images/visuals/treemap.png) `treemap` |\n| ![waterfall](../images/visuals/waterfall.png) `waterfall` |  |  |\n\n## Catalogue\n\n| Type (aliases) | Roles | Notes |\n|---|---|---|\n| `clusteredColumn` (`column`) | `category`* (drillable, multiple) · `legend` · `values`* (multiple) · `smallMultiples` | Sorted by first value, descending, unless the category is a number, a date or has sort-by |\n| `stackedColumn`, `percentStackedColumn` | same | 2 px gaps between segments. Categories sorted by total |\n| `clusteredBar` (`bar`), `stackedBar`, `percentStackedBar` | same | Horizontal versions |\n| `line` | `category`* (drillable) · `legend` · `values`* · `smallMultiples` | Crosshair tooltip, end labels (four or fewer series), markers (16 or fewer points), cross-highlight |\n| `area`, `stackedArea` | same | 10% area wash. Stacked area sums series |\n| `lineClusteredColumn` (`combo`) | `category`* · `legend` (columns) · `values` (columns) · `lineValues` | **One shared value axis** by design. A second y-axis is a known chart anti-pattern |\n| `waterfall` | `category`* (drillable) · `values`* | Running total with connectors, increase / decrease / total colours, optional total bar |\n| `pie`, `donut` | `legend`* (drillable) · `values`* | Folds slices past the palette into \"Other\". Donut shows a centre total |\n| `treemap` | `category`* (drillable) · `values`* | Squarified layout |\n| `funnel` | `category`* · `values`* | Shows % of first stage |\n| `scatter` (`bubble`) | `details`* · `legend` · `x`* · `y`* · `size` | Bubble area ∝ size. Cross-highlight, trend line |\n| `heatmap` | `rows`* · `columns`* · `values`* | Sequential single-hue ramp, gradient legend, cell labels when they fit |\n| `decompositionTree` (`decomp`) | `values`* · `explainBy`* (multiple) | Split a total level by level, click nodes to narrow down, automatic \"High value / Low value\" splits. Cross-filters the page |\n| `histogram` | `values`* (numeric column) · `weight` (optional measure) | Bins by Sturges' rule or `format.histogram.bins` / `binWidth` |\n| `boxPlot` | `category` · `values`* (numeric column) | Quartiles, 1.5 × IQR whiskers, outliers, mean marker |\n| `bullet` | `category` · `value`* · `target` · `maximum` | Value bar over qualitative bands with a target tick |\n| `radar` | `category`* (spokes, 3 or more) · `legend` · `values`* | One polygon per series on a shared radial scale |\n| `sankey` | `source`* · `target`* · `values`* | Multi-stage flows (a target that is also a source becomes a middle column) |\n| `ribbon` | `category`* · `legend`* · `values`* | Stacked by rank in each column, with ribbons showing rank changes |\n| `map` (`bubbleMap`) | `location`* · `legend` · `latitude` · `longitude` · `size` | Columns are averaged per location. Without latitude and longitude, bubbles sit at the centre of their region (`format.map.boundaries` or `geojson`). Optional clustering |\n| `filledMap` (`choropleth`) | `location`* · `values`* | Built-in `boundaries` (`@prismbi/prismbi/geo`) or your `geojson`. Gradient or classed legend |\n| `card` | `value`* · `delta` | Auto-sized callout value, signed delta with good/bad colour |\n| `multiRowCard` | `category` · `values`* | One card per group |\n| `kpi` | `trend` · `value`* · `target` | Headline is the last trend point. Shows % vs goal and a sparkline |\n| `gauge` | `value`* · `min` · `max` · `target` | 180° arc |\n| `table` | `columns`* (columns and measures mixed) | Click a header to sort. Totals, conditional formatting, incremental rendering |\n| `matrix` | `rows` (hierarchy) · `columns` · `values`* | Expand/collapse, column pivot, real subtotals and totals |\n| `slicer` | `field`* (several fields give a hierarchy tree) | list · dropdown · tiles · between · relative date · tree. Sync groups across pages |\n| `text` (`textbox`) | `values` (optional) | Mini-markdown with `{{Measure name}}` placeholders |\n\n`*` marks a required role.\n\n**Small multiples:** put a field in `smallMultiples` (column, bar, line and area charts) to get one panel per member, with a shared value axis and a single legend. Configure it with `format.smallMultiples: { columns?, sharedAxis: true, minWidth: 160, minHeight: 110 }`.\n\n## Common format options\n\nAll of these are optional. Values merge as: base defaults ← visual defaults ← `theme.visualStyles['*']` ← `theme.visualStyles[type]` ← `spec.format`.\n\n```ts\nformat: {\n  title:      { show: true, text, subtitle, fontSize, color, align: 'left'|'center'|'right', bold: true },\n  background: { show: true, color, transparency: 0 },          // 0–100\n  border:     { show: true, color, width: 1, radius },\n  shadow:     { show: false },\n  padding:    12,\n  header:     { show: true, focusMode: true, exportData: true, showAsTable: true, drill: true },\n  tooltip:    { show: true, page: 'tooltip-page-id' },  // report tooltip page\n  legend:     { show: 'auto' | true | false, position: 'top'|'bottom'|'left'|'right', fontSize },\n  dataLabels: { show: false, format, displayUnits: 'auto', decimals, fontSize, color, position: 'auto' },\n  categoryAxis: { show: true, maxLabelWidth: 120, labelAngle: 'auto'|0|45|90,\n                  type: 'auto'|'categorical'|'continuous',   // auto = continuous for date/number fields on line & area\n                  scale: 'linear'|'log' },                   // scatter x-axis\n  valueAxis:  { show: true, displayUnits: 'auto', decimals, min, max, gridlines: true, tickCount: 5, scale: 'linear'|'log' },\n  colors:     { default, palette: [...], series: { 'Total Sales': '#...' }, categories: { 'Bikes': '#...' },\n                rules: [{ op: '<', value: 0, color: '#d03b3b' }],      // single-series charts, first match wins\n                gradient: { min: '#cde2fb', max: '#0d366b' } },        // single-series charts, by value\n  analytics:  { referenceLines: [{ type: 'average' | 'median' | 'min' | 'max' | 'percentile' | 'constant', value?, percentile?, label?: 'Goal {value}' | false, color?, dash? }],\n                trendLine: false | true | { color } },\n  bars:       { maxThickness: 24, radius: 4, gap: 2, categoryGap: 0.35 },\n  lines:      { width: 2, markers: 'auto', smooth: false, area: false, areaOpacity: 0.1, endLabels: true },\n  animation:  { enabled: true, duration: 280 },\n}\n```\n\n`legend.show: 'auto'` shows a legend when there are two or more series, and hides it for one series because the title already says what is plotted.\n\n`animation` controls motion. On the first render, charts grow in. When the data changes (a filter, a slicer or a selection), each data point moves from where it was to its new place, matched by its identity (category, series). Points that are new fade in. Lines and areas morph when their shape allows it. `duration` is in milliseconds. Users with `prefers-reduced-motion` get no animation. Exports always capture the final state.\n\n### Visual-specific sections\n\n```ts\n// card\nformat: { card: { labelPosition: 'top'|'bottom', showLabel: true, align: 'left'|'center', valueFontSize, upIsGood: true, deltaLabel: 'vs LY' } }\n\n// kpi\nformat: { kpi: { upIsGood: true } }\n\n// pie / donut\nformat: { pie: { maxSlices: 8 }, donut: { innerRadius: 0.62, centerLabel: true } }\n\n// table\nformat: { table: {\n  totals: true, rowBanding: true, wrap: false, density: 'compact'|'normal'|'comfortable', pageSize: 200,\n  columnWidths: { 'Total Sales': 140 },\n  conditional: {\n    'Total Sales': { dataBars: true },                         // or { color, negativeColor }\n    'Margin %':    { background: true },                       // or { min, mid, max } colours\n    'YoY %':       { icons: true },                            // ▲ ▼ ● by sign\n    'Profit':      { rules: [{ op: '<', value: 0, color: '#d03b3b' }, { op: 'between', value: 0, value2: 1000, background: '#fff4d6' }] },\n  },\n} }\n\n// matrix\nformat: { matrix: { expandAll: false, columnTotals: true, conditional: { /* as table */ } } }\n\n// slicer\nformat: { slicer: {\n  style: 'list' | 'dropdown' | 'tiles' | 'between' | 'relative' | 'slider',   // dates default to 'between'; 'slider' = one value (what-if)\n  single: false, search: true, selectAll: true, orientation: 'horizontal', placeholder: 'All',\n  relative: { anchor: 'last'|'next'|'this', n: 30, unit: 'days'|'weeks'|'months'|'years', includeToday: true },\n} }\n\n// text\nformat: { text: { content: '# Heading\\n**{{Total Sales}}** this period. [Docs](https://example.com)' } }\n\n// waterfall\nformat: { waterfall: { showTotal: true, totalLabel: 'Total', increaseColor, decreaseColor, totalColor } }\n\n// decomposition tree\nformat: { decomposition: { maxNodes: 10, aiSplits: true, columnWidth: 190 } }\n\n// histogram\nformat: { histogram: { bins: 20, binWidth: 50 } }\n\n// bullet\nformat: { bullet: { bands: [0.6, 0.85, 1], sharedScale: true } }\n\n// maps (bubble and filled)\nformat: { map: {\n  boundaries: 'world',                     // or 'usStates': built-in outlines, after import '@prismbi/prismbi/geo'\n  geojson: featureCollection,              // or your own outlines\n  featureKey: 'name',                      // property (or list) matched against the location field\n  legend: 'classes', classes: 5,           // filled maps: quantile classes instead of a gradient\n  cluster: { radius: 40 },                 // bubble maps: group nearby bubbles; click or Enter zooms in\n  tiles: 'https://tiles.example.com/{z}/{x}/{y}.png', attribution: '© provider',   // optional raster basemap\n  maxRadius: 28, zoom: true, graticule: true,\n} }\n\n// scatter: force a renderer (auto: SVG, canvas above 3,000 points, WebGL above 50,000)\nformat: { scatter: { renderer: 'auto' | 'svg' | 'canvas' | 'webgl' } }\n\n// slicer sync group (any style)\nformat: { slicer: { syncGroup: 'year' } }\n```\n\n## Header actions\n\nHovering or focusing a visual shows its header icons:\n- **⤢ Focus mode** fills the page. Esc exits.\n- **▦ Show as table** displays the query result as a table.\n- **⇩ Export** opens a menu: data (CSV or Excel), image (PNG at 2×), image (SVG). The same is available in code as `report.visual(id).exportCsv()`, `.exportXlsx()`, `.exportImage('png' | 'svg')` and `.toSvg()`.\n- **↑ Drill up**, **⇊ Go to next level** and **⤓ Expand all down one level** appear when a drillable role has several fields.\n- **⌫ Clear selections** appears on slicers.\n\nEach of these can be turned off through `format.header`.\n\n## Accessibility\n\nMarks are focusable (Tab), and Enter or Space selects one. Tooltips also show on focus. Each chart has an `aria-label` from its title, and tables use real `<table>` markup with `aria-sort`. Animations respect `prefers-reduced-motion`.\n\n## Forecast\n\nLine and area charts with a date or number axis can extend each series (up to three) with a forecast:\n\n![A line chart with a forecast band](../images/visuals/line-forecast.png)\n\n```ts\n{ type: 'line', fields: { category: 'Date[Date]', values: 'Total Sales' },\n  format: { analytics: { forecast: { periods: 30, confidence: 0.95, seasonality: 'auto' } } } }\n```\n\n- **Model:** damped additive Holt-Winters. Its parameters are chosen by one-step-ahead error, and the season length is detected by autocorrelation, or given as a number, or turned off with `'none'`.\n- **Display:** the forecast is a dashed line inside a shaded prediction interval that widens with the horizon.\n- **Non-negative series:** a series that has never been negative (sales, counts) is never forecast below zero.\n- **Dates:** future dates follow the calendar for monthly, quarterly and yearly data.\n\n## Error bars\n\nClustered column and bar charts with a single series accept two optional measure roles, **Error bars: lower** (`errorLower`) and **Error bars: upper** (`errorUpper`):\n\n![A column chart with error bars](../images/visuals/column-error-bars.png)\n\n```ts\n{ type: 'clusteredColumn', fields: { category: 'Product[Category]', values: 'Avg Price', errorLower: 'Price P10', errorUpper: 'Price P90' } }\n```\n\n- **Drawing:** each bar gets a whisker with caps between the two bounds. With only one bound, the whisker runs from the bar's value to that bound.\n- **Axis:** the value axis grows to include the bounds.\n- **Tooltip:** shows the range.\n\n## Maps and built-in boundaries\n\n| Filled map (classes) | Bubbles at country centres | Clusters |\n|---|---|---|\n| ![Filled world map](../images/visuals/filled-map-world.png) | ![Bubble map by country](../images/visuals/map-countries.png) | ![Clustered bubble map](../images/visuals/map-cluster.png) |\n\n`@prismbi/prismbi/geo` adds world countries and US states (Natural Earth 1:110m, public domain) as an optional entry. The data is about 60 KB gzipped, and you only pay for it when you import it:\n\n```ts\nimport '@prismbi/prismbi/geo';\n\n{ type: 'filledMap', fields: { location: 'Region[Country]', values: 'Total Sales' }, format: { map: { boundaries: 'world', legend: 'classes' } } }\n{ type: 'map', fields: { location: 'Region[Country]', size: 'Total Sales' }, format: { map: { boundaries: 'world' } } }   // bubbles at country centres\n{ type: 'filledMap', fields: { location: 'Store[State]', values: 'Orders' }, format: { map: { boundaries: 'usStates' } } }\n```\n\n- **Matching:**\n  - Countries match on name, long name, or ISO alpha-2 or alpha-3 code (`France`, `FR`, `FRA`). Common variants like `USA`, `UK` and `Czech Republic` work too.\n  - States match on name, postal code or ISO 3166-2 code (`Texas`, `TX`, `US-TX`).\n  - Locations that don't match are left out.\n- **Framing:** filled maps with built-in boundaries zoom to the regions that have data.\n- **Your own regions:** `registerBoundaries(name, featureCollection, { keys })` adds your own collection under a name. `worldCountries`, `usStates`, `featureCentroid`, `clusterPoints` and `quantileBreaks` are exported for your own geo work.\n- **Clustering:** clusters are recomputed as you zoom. Each cluster shows its count, and its tooltip lists the total and some of its locations. Click a cluster, or press Enter on it, to zoom in.\n\n## Calendar heatmap\n\n`type: 'calendar'` draws one square per day, with weeks as columns and weekdays as rows, and one band per year. It's coloured on the theme's sequential ramp, or by `format.colors.gradient` and rules.\n\n![A calendar heatmap of daily sales](../images/visuals/calendar.png)\n\n```ts\n{ type: 'calendar', fields: { date: 'Date[Date]', values: 'Total Sales' } }\n```\n\n- **Labels:** month names collapse to initials when space is tight, and weekday labels appear when the cells are large enough.\n- **Interaction:** clicking a day cross-filters the page like any data point.\n\n## Axis zoom\n\n`format.categoryAxis.zoom: true` adds a range slider under line and area charts. Dragging its thumbs narrows the visible part of the axis, and **Reset** shows everything again. The zoom is view state kept per visual, so it doesn't change filters or re-query.\n\n![A line chart with a zoomed category axis](../images/visuals/line-zoom.png)\n\n## Try it\n\n```js playground\nimport { createVisual } from '@prismbi/prismbi';\n\nreturn createVisual(el, {\n  model,\n  type: 'waterfall',\n  title: 'Change vs last year by category',\n  fields: { category: 'Product[Category]', values: 'Sales Change' },\n  filters: [{ target: 'Date[Year]', op: 'eq', value: 2025 }],\n});\n```\n\nOn the docs site (`npm run docs`), **▶ Run in playground** opens it in an editor next to its output.\n",ue="$date",ve=["version","id","name","type","title","hidden","layout","fields","filters","format","visuals","pages","x","y","w","h","z"];function Se(o){const t=ve.indexOf(o);return t<0?ve.length:t}function F(o){if(o instanceof Date)return{[ue]:o.toISOString()};if(Array.isArray(o))return o.map(F);if(o&&typeof o=="object"){const t={},e=Object.keys(o).sort((a,n)=>Se(a)-Se(n)||(a<n?-1:a>n?1:0));for(const a of e){const n=o[a];n!==void 0&&typeof n!="function"&&(t[a]=F(n))}return t}return o}function H(o){const t=(e,a)=>{if(e===null||typeof e!="object")return JSON.stringify(e);const n=a+"  ";if(Array.isArray(e)?e.every(u=>u===null||typeof u!="object")&&!(e.length>1&&e.every(u=>typeof u=="string")):Object.values(e).every(u=>u===null||typeof u!="object")){const u=Array.isArray(e)?`[${e.map(d=>JSON.stringify(d)).join(", ")}]`:`{${Object.entries(e).map(([d,m])=>`${JSON.stringify(d)}: ${JSON.stringify(m)}`).join(", ")}}`;if(u.length<=72)return u}if(Array.isArray(e))return e.length?`[
${e.map(u=>n+t(u,n)).join(`,
`)}
${a}]`:"[]";const r=Object.entries(e);return r.length?`{
${r.map(([u,d])=>`${n}${JSON.stringify(u)}: ${t(d,n)}`).join(`,
`)}
${a}}`:"{}"};return t(F(o),"")+`
`}function Q(o,t){return t&&typeof t=="object"&&ue in t&&Object.keys(t).length===1?new Date(t[ue]):t}const Z=(o,t)=>{try{return JSON.parse(o,Q)}catch(e){throw new Error(`${t}: ${e.message}`)}};function P(o){return o.normalize("NFKD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"item"}function se(o,t){let e=o;for(let a=2;t.has(e);a++)e=`${o}-${a}`;return t.add(e),e}function Ze(o){const t=typeof o=="string"?K(o,Q):K(JSON.parse(JSON.stringify(F(o)),Q)),e={},a=new Set,n=[];for(const l of t.pages){const h=se(l.id?P(l.id)===l.id?l.id:P(l.id):P(l.name),a);n.push(h);const p=new Set,g=[];l.visuals.forEach((b,y)=>{const v=se(b.id?P(b.id)===b.id?b.id:P(b.id):`${P(b.type)}-${y+1}`,p);g.push(v),e[`pages/${h}/visuals/${v}.json`]=H({...b,id:b.id??v})});const{visuals:i,...c}=l;e[`pages/${h}/page.json`]=H({...c,id:l.id??h,visuals:g})}const s=new Set,r=(t.bookmarks??[]).map(l=>{const h=se(P(l.name),s);return e[`bookmarks/${h}.json`]=H(l),h}),{pages:u,bookmarks:d,...m}=t;return e["report.json"]=H({...m,pages:n,...r.length?{bookmarks:r}:{}}),e}function et(o){const t={};for(const[g,i]of Object.entries(o))t[g.replace(/\\/g,"/").replace(/^\.\//,"")]=i;const e=t["report.json"];if(e===void 0)throw new Error("report.json not found");const a=Z(e,"report.json"),n=[...new Set(Object.keys(t).map(g=>{var i;return(i=/^pages\/([^/]+)\/page\.json$/.exec(g))==null?void 0:i[1]}).filter(Boolean))],r=[...(a.pages??[]).filter(g=>n.includes(g)),...n.filter(g=>!(a.pages??[]).includes(g)).sort()].map(g=>{const i=Z(t[`pages/${g}/page.json`],`pages/${g}/page.json`),c=`pages/${g}/visuals/`,b=Object.keys(t).filter(E=>E.startsWith(c)&&E.endsWith(".json")&&!E.slice(c.length).includes("/")).map(E=>E.slice(c.length,-5)),y=Array.isArray(i.visuals)?i.visuals.filter(E=>typeof E=="string"):[],R=[...y.filter(E=>b.includes(E)),...b.filter(E=>!y.includes(E)).sort()].map(E=>Z(t[`${c}${E}.json`],`${c}${E}.json`));return{...i,visuals:R}}),u=Object.keys(t).map(g=>{var i;return(i=/^bookmarks\/([^/]+)\.json$/.exec(g))==null?void 0:i[1]}).filter(Boolean),m=[...(a.bookmarks??[]).filter(g=>u.includes(g)),...u.filter(g=>!(a.bookmarks??[]).includes(g)).sort()].map(g=>Z(t[`bookmarks/${g}.json`],`bookmarks/${g}.json`)),{pages:l,bookmarks:h,...p}=a;return K({...p,pages:r,...m.length?{bookmarks:m}:{}})}const oe=(o,t)=>`${o} "${t.title??t.name??t.id??t.type??"?"}"`;function Te(o,t){return o.id??o.name??`#${t}`}function tt(o,t){return JSON.stringify(F(o))===JSON.stringify(F(t))}function G(o,t,e,a,n){if(tt(o,t))return;const s=r=>r!==null&&typeof r=="object"&&!Array.isArray(r)&&!(r instanceof Date);if(s(o)&&s(t)){const r=[...new Set([...Object.keys(o),...Object.keys(t)])].sort();for(const u of r){const d=o[u],m=t[u],l=e?`${e}.${u}`:u;d===void 0&&m!==void 0?a.push({kind:"added",where:`${n} › ${l}`,after:m}):d!==void 0&&m===void 0?a.push({kind:"removed",where:`${n} › ${l}`,before:d}):G(d,m,l,a,n)}return}a.push({kind:"changed",where:e?`${n} › ${e}`:n,before:o,after:t})}function re(o,t,e,a,n,s){const r=o.map(Te),u=t.map(Te);t.forEach((l,h)=>{r.includes(u[h])||n.push({kind:"added",where:`${a}${oe(e,l)}`,after:l})}),o.forEach((l,h)=>{u.includes(r[h])||n.push({kind:"removed",where:`${a}${oe(e,l)}`,before:l})});const d=r.filter(l=>u.includes(l)),m=u.filter(l=>r.includes(l));d.join("")!==m.join("")&&n.push({kind:"moved",where:`${a}${e} order`,before:d,after:m});for(const l of d){const h=o[r.indexOf(l)],p=t[u.indexOf(l)];s(h,p,`${a}${oe(e,p)}`)}}function nt(o,t){const e=typeof o=="string"?K(o,Q):o,a=typeof t=="string"?K(t,Q):t,n=[],{pages:s,bookmarks:r,...u}=e,{pages:d,bookmarks:m,...l}=a;return G(u,l,"",n,"report"),re(s,d,"page","",n,(h,p,g)=>{const{visuals:i,...c}=h,{visuals:b,...y}=p;G(c,y,"",n,g),re(i,b,"visual",`${g} › `,n,(v,R,E)=>G(v,R,"",n,E))}),re(r??[],m??[],"bookmark","",n,(h,p,g)=>G(h,p,"",n,g)),n}const ie=o=>{const t=JSON.stringify(typeof o=="string"?o:F(o));return t===void 0?"undefined":t.length>60?`${t.slice(0,57)}…`:t};function at(o){if(!o.length)return"No changes.";const t={added:"+",removed:"-",changed:"~",moved:"↕"};return o.map(e=>{const a=e.kind==="changed"||e.kind==="moved"?`: ${ie(e.before)} → ${ie(e.after)}`:e.kind==="added"&&!/^(page|visual|bookmark) "/.test(e.where.split(" › ").pop())?` = ${ie(e.after)}`:"";return`${t[e.kind]} ${e.where}${a}`}).join(`
`)}const st=Object.freeze(Object.defineProperty({__proto__:null,diffReports:nt,formatDiff:at,joinReport:et,slug:P,splitReport:Ze,stableStringify:H},Symbol.toStringTag,{value:"Module"}));class ne extends Error{constructor(){super(...arguments),this.name="SqlUnsupportedError"}}const f=o=>{throw new ne(o)},Ee=o=>String(o).padStart(2,"0"),ot=o=>`${o.getFullYear()}-${Ee(o.getMonth()+1)}-${Ee(o.getDate())}`;function rt(o){if(typeof o=="string"){const e=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]00:00(?::00(?:\.0+)?)?(?:Z)?$)/.exec(o);if(e)return new Date(Number(e[1]),Number(e[2])-1,Number(e[3]));const a=new Date(o);return Number.isNaN(a.getTime())?null:a}const t=o instanceof Date?o:typeof o=="number"?new Date(o<1e11?o*864e5:o):null;return!t||Number.isNaN(t.getTime())?null:t.getUTCHours()===0&&t.getUTCMinutes()===0&&t.getUTCSeconds()===0&&t.getUTCMilliseconds()===0?new Date(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()):t}const Ae=o=>o.split(".").map(t=>`"${t.replace(/"/g,'""')}"`).join("."),he=o=>{const t=/^'?(.*?)'?\[([^\]]+)\]$/.exec(o.trim());return t?{table:t[1],column:t[2]}:f(`Not a column reference: ${o}`)},le=o=>typeof o=="string"?he(o):o;class ge{constructor(t,e,a,n,s="t",r=[]){this.model=t,this.opts=e,this.base=a,this.rowExpr=n,this.prefix=s,this.rels=r,this.aliases=new Map,this.joins=[],this.aliases.set(a,`${s}0`)}table(t){var e;return Ae(((e=this.opts.tables)==null?void 0:e[t])??t)}alias(t){const e=this.aliases.get(t);if(e)return e;let a=this.model.pathTo(this.base,t);a||(a=this.rels.filter(s=>s.fromTable===this.base&&s.toTable===t).slice(0,1)),!a.length&&this.base!==t&&f(`No many-to-one relationship path from ${this.base} to ${t}`);let n=`${this.prefix}0`;for(const s of a){const r=this.rels.find(m=>m.fromTable===s.fromTable&&m.toTable===s.toTable)??s,u=this.aliases.get(r.toTable);if(u){n=u;continue}const d=`${this.prefix}${this.aliases.size}`;this.aliases.set(r.toTable,d),this.joins.push(`LEFT JOIN ${this.table(r.toTable)} AS ${d} ON ${n}.${this.columnName(r.fromTable,r.fromColumn)} = ${d}.${this.columnName(r.toTable,r.toColumn)}`),n=d}return n}columnName(t,e){var a,n;return Ae(((n=(a=this.opts.columns)==null?void 0:a[t])==null?void 0:n[e])??e)}col(t){var a,n;(!this.model.hasTable(t.table)||!this.model.table(t.table).hasColumn(t.column))&&f(`Unknown column ${t.table}[${t.column}]`);const e=this.model.table(t.table).column(t.column);return e.expression&&!((n=(a=this.opts.columns)==null?void 0:a[t.table])!=null&&n[t.column])?(e.type==="date"&&f(`Calculated date column ${t.table}[${t.column}]: add it to the database and map it in \`columns\``),`(${this.rowExpr(this,q(e.expression))})`):`${this.alias(t.table)}.${this.columnName(t.table,t.column)}`}from(){return[`FROM ${this.table(this.base)} AS ${this.prefix}0`,...this.joins].join(`
`)}}class Re{constructor(t,e){this.model=t,this.dialect=e,this.touched=new Set}literal(t){if(t==null)return"NULL";if(t instanceof Date){const e=ot(t);return this.dialect==="sqlite"?`'${e}'`:`DATE '${e}'`}return typeof t=="number"?Number.isFinite(t)?String(t):"NULL":typeof t=="boolean"?this.dialect==="sqlite"?t?"1":"0":t?"TRUE":"FALSE":`'${String(t).replace(/'/g,"''")}'`}filter(t,e,a){if(e.op==="tuples"){const d=e.targets.map(l=>t.col(le(l))),m=e.tuples.map(l=>`(${l.map((h,p)=>h===null?`${d[p]} IS NULL`:`${d[p]} = ${this.literal(h)}`).join(" AND ")})`).join(" OR ")||"FALSE";return e.exclude?`NOT (${m})`:`(${m})`}const n=t.col(le(e.target)),s=d=>this.literal(d??null),r=d=>`LOWER(CAST(${n} AS VARCHAR)) LIKE ${this.literal(d.toLowerCase())} ESCAPE '\\'`,u=d=>String(d??"").replace(/[\\%_]/g,m=>`\\${m}`);switch(e.op){case"eq":return e.value===null||e.value===void 0?`${n} IS NULL`:`${n} = ${s(e.value)}`;case"neq":return e.value===null||e.value===void 0?`${n} IS NOT NULL`:`(${n} <> ${s(e.value)} OR ${n} IS NULL)`;case"in":case"notIn":{const d=e.values??[],m=d.filter(p=>p!=null),l=m.length<d.length,h=m.length?`${n} IN (${m.map(s).join(", ")})`:"FALSE";return e.op==="in"?l?`(${h} OR ${n} IS NULL)`:h:l?`(NOT ${h} AND ${n} IS NOT NULL)`:`(NOT ${h} OR ${n} IS NULL)`}case"gt":return`${n} > ${s(e.value)}`;case"gte":return`${n} >= ${s(e.value)}`;case"lt":return`${n} < ${s(e.value)}`;case"lte":return`${n} <= ${s(e.value)}`;case"between":return[e.min!==void 0&&e.min!==null?`${n} >= ${s(e.min)}`:"",e.max!==void 0&&e.max!==null?`${n} <= ${s(e.max)}`:""].filter(Boolean).join(" AND ")||"TRUE";case"contains":return r(`%${u(e.value)}%`);case"notContains":return`(NOT ${r(`%${u(e.value)}%`)} OR ${n} IS NULL)`;case"startsWith":return r(`${u(e.value)}%`);case"endsWith":return r(`%${u(e.value)}`);case"isBlank":return`${n} IS NULL`;case"isNotBlank":return`${n} IS NOT NULL`;case"topN":return this.topN(t,e,a);default:return f(`Filter operator ${e.op}`)}}topN(t,e,a){const n=le(e.target),s=ee(this.model,e.by),r=new ge(this.model,t.opts,t.base,(p,g)=>this.rowExpr(p,g)),u=a.filter(p=>p!==e&&p.op!=="topN"),d=u.map(p=>this.filter(r,p,u)),m=r.col(n),l=this.value(r,s.ast,[],a),h=e.direction==="bottom"?"ASC":"DESC";return`${t.col(n)} IN (SELECT g FROM (SELECT ${m} AS g, ${l} AS s
${r.from()}${d.length?`
WHERE ${d.join(" AND ")}`:""}
GROUP BY 1 ORDER BY 2 ${h} NULLS LAST LIMIT ${Math.max(0,Math.floor(e.n))}) AS topn)`}value(t,e,a,n,s=new Map,r=0){r>40&&f("Measures nest too deeply");const u=(m,l=a)=>this.value(t,m,l,n,s,r+1),d=m=>m.length?` FILTER (WHERE ${m.join(" AND ")})`:"";switch(e.type){case"number":case"string":case"boolean":return this.literal(e.value);case"bracket":return this.model.hasMeasure(e.name)?`(${u(q(this.model.measure(e.name).expression))})`:f(`[${e.name}] is not a measure`);case"varRef":return s.get(e.name)??f(`Unknown variable ${e.name}`);case"var":{const m=new Map(s);for(const l of e.bindings)m.set(l.name,`(${this.value(t,l.value,a,n,m,r+1)})`);return this.value(t,e.body,a,n,m,r+1)}case"unary":return e.op==="NOT"?`(NOT ${u(e.operand)})`:e.op==="-"?`(-${u(e.operand)})`:u(e.operand);case"binary":{const m=u(e.left),l=u(e.right);if(e.op==="+"||e.op==="-")return`(CASE WHEN ${m} IS NULL AND ${l} IS NULL THEN NULL ELSE COALESCE(${m}, 0) ${e.op} COALESCE(${l}, 0) END)`;if(e.op==="*")return`(${m} * ${l})`;if(e.op==="/")return`(${m} * 1.0 / NULLIF(${l}, 0))`;const h={"=":"=","==":"=","<>":"<>","<":"<",">":">","<=":"<=",">=":">=","&&":"AND","||":"OR","&":"||"};return h[e.op]?`(${m} ${h[e.op]} ${l})`:f(`Operator ${e.op}`)}case"call":return this.call(t,e.name.toUpperCase(),e.args,a,n,s,r,d);case"column":return f(`${e.table}[${e.column}] needs an aggregation (SUM, AVERAGE…) in a measure`);default:return f(`${e.type} expressions`)}}call(t,e,a,n,s,r,u,d){var p,g;const m=(i,c=n)=>this.value(t,i,c,s,r,u+1),l=i=>(i==null?void 0:i.type)==="column"?t.col({table:i.table,column:i.column}):f(`${e} needs a column`),h={SUM:"SUM",AVERAGE:"AVG",MIN:"MIN",MAX:"MAX"};if(h[e])return`${h[e]}(${l(a[0])})${d(n)}`;switch(e){case"COUNT":case"COUNTA":return`NULLIF(COUNT(${l(a[0])})${d(n)}, 0)`;case"DISTINCTCOUNT":return`NULLIF(COUNT(DISTINCT ${l(a[0])})${d(n)}, 0)`;case"MEDIAN":return this.dialect!=="duckdb"&&f("MEDIAN is only pushed down to DuckDB"),`MEDIAN(${l(a[0])})${d(n)}`;case"COUNTROWS":return(((p=a[0])==null?void 0:p.type)!=="table"||a[0].name!==t.base)&&f(`COUNTROWS of anything but the fact table (${t.base})`),`NULLIF(COUNT(*)${d(n)}, 0)`;case"SUMX":case"AVERAGEX":case"MINX":case"MAXX":return(((g=a[0])==null?void 0:g.type)!=="table"||a[0].name!==t.base)&&f(`${e} over anything but the fact table (${t.base})`),`${{SUMX:"SUM",AVERAGEX:"AVG",MINX:"MIN",MAXX:"MAX"}[e]}(${this.rowExpr(t,a[1])})${d(n)}`;case"DIVIDE":{const i=m(a[0]),c=m(a[1]);return`(CASE WHEN COALESCE(${c}, 0) = 0 THEN ${a[2]?m(a[2]):"NULL"} ELSE ${i} * 1.0 / ${c} END)`}case"IF":return`(CASE WHEN ${m(a[0])} THEN ${m(a[1])} ELSE ${a[2]?m(a[2]):"NULL"} END)`;case"BLANK":return"NULL";case"ISBLANK":return`(${m(a[0])} IS NULL)`;case"COALESCE":return`COALESCE(${a.map(i=>m(i)).join(", ")})`;case"ABS":return`ABS(${m(a[0])})`;case"ROUND":return`ROUND(${m(a[0])}, ${a[1]?m(a[1]):"0"})`;case"CALCULATE":{const i=a.slice(1).map(c=>this.predicate(t,c,s));return m(a[0],[...n,...i])}default:return f(`${e}() is not pushed down to SQL`)}}rowExpr(t,e){switch(e.type){case"number":case"string":case"boolean":return this.literal(e.value);case"column":return t.col({table:e.table,column:e.column});case"unary":return e.op==="-"?`(-${this.rowExpr(t,e.operand)})`:this.rowExpr(t,e.operand);case"binary":{const a={"+":"+","-":"-","*":"*"};return e.op==="/"?`(${this.rowExpr(t,e.left)} * 1.0 / NULLIF(${this.rowExpr(t,e.right)}, 0))`:a[e.op]?`(${this.rowExpr(t,e.left)} ${a[e.op]} ${this.rowExpr(t,e.right)})`:f(`Operator ${e.op} in a row expression`)}case"call":return e.name.toUpperCase()==="RELATED"?this.rowExpr(t,e.args[0]):f(`${e.name}() in a row expression`);default:return f(`${e.type} in a row expression`)}}predicate(t,e,a,n=!1){if(e.type==="call"&&e.name.toUpperCase()==="KEEPFILTERS")return this.predicate(t,e.args[0],a,!0);if(e.type==="binary"&&(e.op==="&&"||e.op==="||"))return`(${this.predicate(t,e.left,a,n)} ${e.op==="&&"?"AND":"OR"} ${this.predicate(t,e.right,a,n)})`;if(e.type==="binary"&&e.left.type==="column"){const s={table:e.left.table,column:e.left.column};!n&&(this.touched.has(`${s.table}[${s.column}]`)||a.some(m=>"target"in m&&it(m.target,s)))&&f(`CALCULATE replaces the filter on ${s.table}[${s.column}], which this query also uses (wrap it in KEEPFILTERS to intersect)`);const r=t.col(s);if(e.op==="IN"&&e.right.type==="list")return`${r} IN (${e.right.items.map(m=>m.type==="number"||m.type==="string"||m.type==="boolean"?this.literal(m.value):f("IN lists must hold constants")).join(", ")})`;const u=e.right.type==="number"||e.right.type==="string"||e.right.type==="boolean"?this.literal(e.right.value):e.right.type==="call"&&e.right.name.toUpperCase()==="BLANK"?"NULL":f("CALCULATE filters must compare a column with a constant"),d={"=":"=","==":"=","<>":"<>","<":"<",">":">","<=":"<=",">=":">="};return u==="NULL"?e.op==="<>"?`${r} IS NOT NULL`:`${r} IS NULL`:d[e.op]?`${r} ${d[e.op]} ${u}`:f(`Operator ${e.op} in a CALCULATE filter`)}return f(e.type==="call"?`${e.name.toUpperCase()}() is not pushed down to SQL (CALCULATE supports column comparisons)`:"CALCULATE filters other than column comparisons")}}const it=(o,t)=>{const e=he(o);return e.table===t.table&&e.column===t.column};function lt(o,t){const e=new Set,a=new Set,n=s=>{var r,u;if(s.type==="call"){const d=s.name.toUpperCase();["SUM","AVERAGE","MIN","MAX","COUNT","COUNTA","DISTINCTCOUNT","MEDIAN"].includes(d)&&((r=s.args[0])==null?void 0:r.type)==="column"&&e.add(s.args[0].table),["COUNTROWS","SUMX","AVERAGEX","MINX","MAXX"].includes(d)&&((u=s.args[0])==null?void 0:u.type)==="table"&&e.add(s.args[0].name),s.args.forEach(n)}else s.type==="bracket"&&o.hasMeasure(s.name)&&!a.has(s.name)?(a.add(s.name),n(q(o.measure(s.name).expression))):s.type==="binary"?(n(s.left),n(s.right)):s.type==="unary"?n(s.operand):s.type==="var"&&(s.bindings.forEach(d=>n(d.value)),n(s.body))};return t.forEach(n),e.size>1&&f(`Measures aggregate several tables (${[...e].join(", ")})`),[...e][0]}const z=o=>"kind"in o?o.kind==="columns"&&o.spec?o.spec:f("Row-level security and relationship filters are not pushed down to SQL"):o,x=o=>`${o.table}[${o.column}]`;class dt{constructor(t,e,a,n,s){this.model=t,this.opts=e,this.tr=a,this.dialect=n,this.base=s,this.seq=0,this.hoisted=new Map,this.hoistTo=null,this.groupCount=0,this.sets=new Map}hoist(t){if(this.hoistTo!=="groups"||t.includes("tn.m"))return t;let e=this.hoisted.get(t);return e||(e=`h${this.hoisted.size}`,this.hoisted.set(t,e)),`c.${e}`}takeHoisted(){const t={scalars:[...this.hoisted].map(([e,a])=>`${e} AS ${a}`),sets:[...this.sets]};return this.hoisted.clear(),this.sets.clear(),t}membership(t,e,a,n,s){const r=this.scope(e,n),u=a.map(i=>r.col(i)),d=[...this.applicable(e,n).filter(i=>!i.rel).map(i=>i.build(r)),s(r)],m=a.length===1?t.col(a[0]):`(${a.map(i=>t.col(i)).join(", ")})`;if(this.hoistTo!=="groups")return`${m} IN (SELECT ${u.join(", ")}
${r.from()}
WHERE ${d.join(" AND ")})`;const l=Array.from({length:this.groupCount},(i,c)=>c),h=`SELECT ${[...l.map(i=>`c.g${i}`),...u.map((i,c)=>`${i} AS k${c}`)].join(", ")}
FROM hz AS c CROSS JOIN ${r.from().replace(/^FROM /,"")}
WHERE ${d.join(" AND ")}`;let p=this.sets.get(h);p||(p=`hs${this.sets.size}`,this.sets.set(h,p));const g=l.map(i=>this.isNotDistinct(`${p}.g${i}`,`c.g${i}`));return`${m} IN (SELECT ${u.map((i,c)=>`${p}.k${c}`).join(", ")} FROM ${p}${g.length?` WHERE ${g.join(" AND ")}`:""})`}transitions(t){return t.type==="bracket"?this.model.hasMeasure(t.name):t.type==="call"?t.name.toUpperCase()==="CALCULATE"||t.args.some(e=>this.transitions(e)):t.type==="binary"?this.transitions(t.left)||this.transitions(t.right):t.type==="unary"?this.transitions(t.operand):!1}scope(t,e=[]){const a=e.flatMap(n=>n.rel?[n.rel]:[]);return new ge(this.model,this.opts,t,(n,s)=>this.tr.rowExpr(n,s),`q${++this.seq}_`,a)}isNotDistinct(t,e){return this.dialect==="sqlite"?`${t} IS ${e}`:`${t} IS NOT DISTINCT FROM ${e}`}reaches(t,e){const a=this.model.expanded(t);return e.tables.every(n=>a.has(n))}applicable(t,e){return e.filter(a=>this.reaches(t,a))}subquery(t,e,a,n=[]){const s=this.scope(t,a),r=e(s),u=[...this.applicable(t,a).filter(d=>!d.rel).map(d=>d.build(s)),...n.map(d=>d(s))];return`(SELECT ${r}
${s.from()}${u.length?`
WHERE ${u.join(" AND ")}`:""})`}shift(t,e,a){if(!e)return t;const n=a==="year"?e*12:a==="quarter"?e*3:a==="month"?e:0,s=a==="day"?e:0;return this.dialect==="sqlite"?n?`MIN(date(${t}, 'start of month', '${n>=0?"+":""}${n} months', '+' || (CAST(strftime('%d', ${t}) AS INTEGER) - 1) || ' days'), date(${t}, 'start of month', '${n+1>=0?"+":""}${n+1} months', '-1 day'))`:`date(${t}, '${s>=0?"+":""}${s} days')`:this.dialect==="postgres"?`CAST(${t} + make_interval(months => ${n}, days => ${s}) AS DATE)`:n?`CAST(${t} + to_months(${n}) AS DATE)`:`CAST(${t} + to_days(${s}) AS DATE)`}daysBetween(t,e){return this.dialect==="sqlite"?`CAST(julianday(${e}) - julianday(${t}) AS INTEGER)`:this.dialect==="postgres"?`(${e} - ${t})`:`date_diff('day', ${t}, ${e})`}monthEnd(t){return this.dialect==="sqlite"?`date(${t}, 'start of month', '+1 month', '-1 day')`:this.dialect==="postgres"?`CAST(date_trunc('month', ${t}) + INTERVAL '1 month - 1 day' AS DATE)`:`last_day(${t})`}shiftedDates(t,e,a,n){const s=(i,c=()=>[])=>{const b=this.scope(t.table,e),y=b.col(t),v=[...this.applicable(t.table,e).filter(R=>!R.rel).map(R=>R.build(b)),...c(y)];return`(SELECT ${i(y)}
${b.from()}${v.length?`
WHERE ${v.join(" AND ")}`:""})`},r=s(i=>this.shift(i,a,n)),u=s(i=>i,i=>[`${i} = ${this.monthEnd(i)}`]),d=i=>{if(n==="day")return`${i} IN ${r}`;const c=this.monthEnd(this.shift(i,-a,n));return`(${i} IN ${r} OR (${c} IN ${u} AND ${this.shift(c,a,n)} < ${i}))`},m=this.hoist(s(i=>`MIN(${i})`)),l=this.hoist(s(i=>`MAX(${i})`)),h=this.hoist(s(()=>"COUNT(*)")),p=n==="day"?this.shift(l,a,n):`(CASE WHEN ${l} = ${this.monthEnd(l)} THEN ${this.monthEnd(this.shift(l,a,n))} ELSE ${this.shift(l,a,n)} END)`,g=`${h} = ${this.daysBetween(m,l)} + 1`;return i=>`(CASE WHEN ${g} THEN ${i} >= ${this.shift(m,a,n)} AND ${i} <= ${p} ELSE ${d(i)} END)`}startOf(t,e){return this.dialect!=="sqlite"?`CAST(date_trunc('${t}', ${e}) AS DATE)`:t==="year"?`date(${e}, 'start of year')`:t==="month"?`date(${e}, 'start of month')`:`date(${e}, 'start of month', '-' || ((CAST(strftime('%m', ${e}) AS INTEGER) - 1) % 3) || ' months')`}dates(t,e,a){return this.subquery(t.table,n=>a(n.col(t)),e)}timeFilter(t,e,a){var p,g;const n=e[0];if((n==null?void 0:n.type)!=="column")return f(`${t} needs a date column`);const s={table:n.table,column:n.column},r=a.filter(i=>!i.tables.includes(s.table)),u=i=>[...r,{kind:"calc",cols:[x(s)],tables:[s.table],build:c=>i(c.col(s))}],d=(i,c)=>this.shiftedDates(s,a,i,c),m=i=>{const c=((i==null?void 0:i.type)==="table"?i.name:(i==null?void 0:i.type)==="string"?i.value:"").toLowerCase();return c==="year"||c==="quarter"||c==="month"||c==="day"?c:f(`${t}: unknown interval ${c||"(none)"}`)},l=this.hoist(this.dates(s,a,i=>`MAX(${i})`)),h=this.hoist(this.dates(s,a,i=>`MIN(${i})`));switch(t){case"SAMEPERIODLASTYEAR":return u(d(-1,"year"));case"DATEADD":{const i=((p=e[1])==null?void 0:p.type)==="number"?e[1].value:((g=e[1])==null?void 0:g.type)==="unary"&&e[1].op==="-"&&e[1].operand.type==="number"?-e[1].operand.value:f("DATEADD needs a constant number of intervals");return u(d(i,m(e[2])))}case"DATESYTD":case"DATESQTD":case"DATESMTD":{const i=t==="DATESYTD"?"year":t==="DATESQTD"?"quarter":"month";return u(c=>`${c} >= ${this.startOf(i,l)} AND ${c} <= ${l}`)}case"PREVIOUSYEAR":case"PREVIOUSQUARTER":case"PREVIOUSMONTH":{const i=t==="PREVIOUSYEAR"?"year":t==="PREVIOUSQUARTER"?"quarter":"month",c=this.startOf(i,h);return u(b=>`${b} >= ${this.shift(c,-1,i)} AND ${b} < ${c}`)}case"DATESBETWEEN":{const i=this.value(e[1],a),c=this.value(e[2],a);return u(b=>`${b} >= ${i} AND ${b} <= ${c}`)}default:return f(`${t}() is not pushed down to SQL`)}}columnsIn(t,e=[]){return t.type==="column"?e.push({table:t.table,column:t.column}):t.type==="binary"?(this.columnsIn(t.left,e),this.columnsIn(t.right,e)):t.type==="unary"?this.columnsIn(t.operand,e):t.type==="list"?t.items.forEach(a=>this.columnsIn(a,e)):t.type==="call"&&!ct.has(t.name.toUpperCase())&&t.args.forEach(a=>this.columnsIn(a,e)),e}keyCols(t){const e=this.model.relationships().find(a=>a.toTable===t);return e?[{table:t,column:e.toColumn}]:[...this.model.table(t).columns.values()].filter(a=>!a.expression).map(a=>({table:t,column:a.name}))}tableArg(t,e){if(t.type==="table")return{table:t.name,ctx:e,row:this.keyCols(t.name)};if(t.type==="call"){const a=t.name.toUpperCase(),n=t.args[0];if(a==="ALL"||a==="REMOVEFILTERS"||a==="ALLSELECTED")return(n==null?void 0:n.type)==="table"?{table:n.name,ctx:this.applyOne(t,e),row:this.keyCols(n.name)}:(n==null?void 0:n.type)==="column"?{table:n.table,ctx:this.applyOne(t,e),row:t.args.filter(s=>s.type==="column").map(s=>({table:s.table,column:s.column}))}:f(`${a}() inside FILTER needs a table or column`);if(a==="VALUES"||a==="DISTINCT"){if((n==null?void 0:n.type)==="table")return{table:n.name,ctx:e,row:this.keyCols(n.name)};if((n==null?void 0:n.type)==="column")return{table:n.table,ctx:e,row:[{table:n.table,column:n.column}]}}}return f("FILTER over this table expression is not pushed down to SQL")}transition(t,e,a){const n=e.map(x);return[...t.filter(s=>s.kind==="security"||!s.cols.some(r=>n.includes(r))),...e.map(s=>({kind:"calc",cols:[x(s)],tables:[s.table],build:r=>this.isNotDistinct(r.col(s),a.col(s))}))]}secure(t,e){const a=t.filter(n=>n.kind==="security");return a.length?[...e.filter(n=>n.kind!=="security"),...a]:e}applyOne(t,e,a=!1){return this.secure(e,this.applyRaw(t,e,a))}applyRaw(t,e,a){var m;const n=l=>[...this.model.expanded(l)],s=(l,h)=>l.tables.some(p=>h.includes(p));if(t.type==="call"){const l=t.name.toUpperCase(),h=t.args;if(l==="KEEPFILTERS")return this.applyOne(h[0],e,!0);if((l==="ALL"||l==="REMOVEFILTERS")&&!h.length)return[];if(l==="ALL"||l==="REMOVEFILTERS"){if(h.every(i=>i.type==="table")){const i=h.flatMap(c=>n(c.name));return e.filter(c=>!s(c,i))}const p=h.map(i=>i.type==="column"?x(i):f(`${l} takes a table or columns`)),g=h.map(i=>i.table);return e.filter(i=>!(i.cols.some(c=>p.includes(c))||!i.cols.length&&s(i,g)))}if(l==="ALLSELECTED"){if(!h.length)return[...this.base];const p=h.flatMap(c=>c.type==="table"?n(c.name):c.type==="column"?[c.table]:f("ALLSELECTED takes a table or columns")),g=h.filter(c=>c.type==="column").map(c=>x(c)),i=c=>g.length?c.cols.some(b=>g.includes(b)):s(c,p);return[...e.filter(c=>!i(c)),...this.base.filter(i)]}if(l==="ALLEXCEPT"){const p=((m=h[0])==null?void 0:m.type)==="table"?h[0].name:f("ALLEXCEPT needs a table first"),g=h.slice(1).map(c=>c.type==="column"?x(c):f("ALLEXCEPT keeps columns")),i=n(p);return e.filter(c=>!s(c,i)||c.cols.length>0&&c.cols.every(b=>g.includes(b)))}if(l==="FILTER"){const{table:p,ctx:g,row:i}=this.tableArg(h[0],e),c=h[1],b=this.columnsIn(c).filter(y=>y.table===p||this.model.expanded(p).has(y.table));return this.transitions(c)?[...g,{kind:"calc",cols:[],tables:[p],build:y=>this.membership(y,p,i,g,v=>this.rowCond(v,c,e,i))}]:[...g,{kind:"calc",cols:[],tables:[p,...b.map(y=>y.table)],build:y=>this.rowCond(y,c,e,i)}]}if(l==="USERELATIONSHIP"){const[p,g]=h;if((p==null?void 0:p.type)!=="column"||(g==null?void 0:g.type)!=="column")return f("USERELATIONSHIP needs two columns");const i=(y,v,R)=>y.fromTable===v.table&&y.fromColumn===v.column&&y.toTable===R.table&&y.toColumn===R.column,c=this.model.relationships().find(y=>i(y,p,g)||i(y,g,p))??f(`USERELATIONSHIP: no relationship between ${p.table}[${p.column}] and ${g.table}[${g.column}]`),b={fromTable:c.fromTable,fromColumn:c.fromColumn,toTable:c.toTable,toColumn:c.toColumn};return[...e.filter(y=>!(y.rel&&y.rel.fromTable===b.fromTable&&y.rel.toTable===b.toTable)),{kind:"calc",cols:[],tables:[],rel:b,build:()=>"TRUE"}]}return l==="CROSSFILTER"?f(`${l} is not pushed down to SQL`):ut.has(l)?this.timeFilter(l,h,e):f(`${l}() as a CALCULATE filter is not pushed down to SQL`)}const r=this.columnsIn(t);if(!r.length)return f("CALCULATE filter without a column");const u=[...new Set(r.map(x))];return[...a?e:e.filter(l=>!l.cols.some(h=>u.includes(h))),{kind:"calc",cols:u,tables:[...new Set(r.map(l=>l.table))],build:l=>this.rowCond(l,t,e)}]}rowCond(t,e,a,n){const s=r=>this.rowCond(t,r,a,n);switch(e.type){case"number":case"string":case"boolean":return this.tr.literal(e.value);case"column":return t.col({table:e.table,column:e.column});case"unary":return e.op==="NOT"?`(NOT ${s(e.operand)})`:e.op==="-"?`(-${s(e.operand)})`:s(e.operand);case"list":return`(${e.items.map(s).join(", ")})`;case"binary":{if(e.op==="IN")return`${s(e.left)} IN ${e.right.type==="list"?s(e.right):f("IN needs a list")}`;const r={"=":"=","==":"=","<>":"<>","<":"<",">":">","<=":"<=",">=":">=","&&":"AND","||":"OR","+":"+","-":"-","*":"*","&":"||"};return e.op==="/"?`(${s(e.left)} * 1.0 / NULLIF(${s(e.right)}, 0))`:(e.op==="="||e.op==="==")&&e.right.type==="call"&&e.right.name.toUpperCase()==="BLANK"?`(${s(e.left)} IS NULL)`:r[e.op]?`(${s(e.left)} ${r[e.op]} ${s(e.right)})`:f(`Operator ${e.op}`)}case"call":{const r=e.name.toUpperCase();if(r==="RELATED")return s(e.args[0]);if(r==="BLANK")return"NULL";if(r==="ISBLANK")return`(${s(e.args[0])} IS NULL)`;if(r==="USERNAME"||r==="USERPRINCIPALNAME")return this.tr.literal(this.model.currentUser);if(r==="CUSTOMDATA")return this.tr.literal(this.model.customData);if(r==="CALCULATE"&&n)return this.value(e,this.transition(a,n,t));if(r==="DATE")return this.tr.literal(new Date(Number(e.args[0].value),Number(e.args[1].value)-1,Number(e.args[2].value)));if(r==="YEAR"||r==="MONTH"||r==="DAY"){const u=s(e.args[0]);return this.dialect==="sqlite"?`CAST(strftime('${r==="YEAR"?"%Y":r==="MONTH"?"%m":"%d"}', ${u}) AS INTEGER)`:`EXTRACT(${r} FROM ${u})`}return this.value(e,a)}case"bracket":return this.model.hasMeasure(e.name)?n?`(${this.value(q(this.model.measure(e.name).expression),this.transition(a,n,t))})`:f(`[${e.name}] outside a row context in a filter condition`):f(`[${e.name}] is not a measure`);default:return f(`${e.type} in a filter condition`)}}value(t,e,a=new Map,n=0){n>60&&f("Measures nest too deeply");const s=(r,u=e)=>this.value(r,u,a,n+1);switch(t.type){case"number":case"string":case"boolean":return this.tr.literal(t.value);case"bracket":return this.model.hasMeasure(t.name)?`(${s(q(this.model.measure(t.name).expression))})`:f(`[${t.name}] is not a measure`);case"varRef":return a.get(t.name)??f(`Unknown variable ${t.name}`);case"var":{const r=new Map(a);for(const u of t.bindings)r.set(u.name,`(${this.value(u.value,e,r,n+1)})`);return this.value(t.body,e,r,n+1)}case"unary":return t.op==="NOT"?`(NOT ${s(t.operand)})`:t.op==="-"?`(-${s(t.operand)})`:s(t.operand);case"binary":{const r=s(t.left),u=s(t.right);if(t.op==="+"||t.op==="-")return`(CASE WHEN ${r} IS NULL AND ${u} IS NULL THEN NULL ELSE COALESCE(${r}, 0) ${t.op} COALESCE(${u}, 0) END)`;if(t.op==="*")return`(${r} * ${u})`;if(t.op==="/")return`(${r} * 1.0 / NULLIF(${u}, 0))`;const d={"=":"=","==":"=","<>":"<>","<":"<",">":">","<=":"<=",">=":">=","&&":"AND","||":"OR","&":"||"};return d[t.op]?`(${r} ${d[t.op]} ${u})`:f(`Operator ${t.op}`)}case"call":return this.call(t.name.toUpperCase(),t.args,e,s);case"column":return f(`${t.table}[${t.column}] needs an aggregation (SUM, AVERAGE…) in a measure`);default:return f(`${t.type} expressions`)}}call(t,e,a,n){var u;const s=d=>(d==null?void 0:d.type)==="column"?{table:d.table,column:d.column}:f(`${t} needs a column`),r=(d,m,l=!1)=>this.subquery(m.table,h=>`${d}(${l?"DISTINCT ":""}${h.col(m)})`,a);switch(t){case"SUM":return r("SUM",s(e[0]));case"AVERAGE":return r("AVG",s(e[0]));case"MIN":case"MAX":return e.length===2?`${t==="MIN"?"LEAST":"GREATEST"}(${n(e[0])}, ${n(e[1])})`:r(t,s(e[0]));case"COUNT":case"COUNTA":return`NULLIF(${r("COUNT",s(e[0]))}, 0)`;case"DISTINCTCOUNT":return`NULLIF(${r("COUNT",s(e[0]),!0)}, 0)`;case"MEDIAN":return this.dialect!=="duckdb"&&f("MEDIAN is only pushed down to DuckDB"),r("MEDIAN",s(e[0]));case"COUNTROWS":{const d=e[0];if((d==null?void 0:d.type)==="table")return`NULLIF(${this.subquery(d.name,()=>"COUNT(*)",a)}, 0)`;if((d==null?void 0:d.type)==="call"&&d.name.toUpperCase()==="FILTER"){const{table:m,ctx:l,row:h}=this.tableArg(d.args[0],a);return`NULLIF(${this.subquery(m,()=>"COUNT(*)",l,[p=>this.rowCond(p,d.args[1],a,h)])}, 0)`}return(d==null?void 0:d.type)==="call"&&(d.name.toUpperCase()==="VALUES"||d.name.toUpperCase()==="DISTINCT")&&((u=d.args[0])==null?void 0:u.type)==="column"?`NULLIF(${r("COUNT",s(d.args[0]),!0)}, 0)`:f("COUNTROWS of this table expression is not pushed down to SQL")}case"SUMX":case"AVERAGEX":case"MINX":case"MAXX":{const d={SUMX:"SUM",AVERAGEX:"AVG",MINX:"MIN",MAXX:"MAX"}[t],m=e[0];if((m==null?void 0:m.type)==="table")return this.subquery(m.name,l=>`${d}(${this.tr.rowExpr(l,e[1])})`,a);if((m==null?void 0:m.type)==="call"&&m.name.toUpperCase()==="FILTER"){const{table:l,ctx:h,row:p}=this.tableArg(m.args[0],a);return this.subquery(l,g=>`${d}(${this.tr.rowExpr(g,e[1])})`,h,[g=>this.rowCond(g,m.args[1],a,p)])}return f(`${t} over this table expression is not pushed down to SQL`)}case"DIVIDE":{const d=n(e[0]),m=n(e[1]);return`(CASE WHEN COALESCE(${m}, 0) = 0 THEN ${e[2]?n(e[2]):"NULL"} ELSE ${d} * 1.0 / ${m} END)`}case"IF":return`(CASE WHEN ${n(e[0])} THEN ${n(e[1])} ELSE ${e[2]?n(e[2]):"NULL"} END)`;case"BLANK":return"NULL";case"ISBLANK":return`(${n(e[0])} IS NULL)`;case"COALESCE":return`COALESCE(${e.map(d=>n(d)).join(", ")})`;case"ABS":return`ABS(${n(e[0])})`;case"ROUND":return`ROUND(${n(e[0])}, ${e[1]?n(e[1]):"0"})`;case"CALCULATE":{let d=a;for(const m of e.slice(1))d=this.applyOne(m,d);return n(e[0],d)}case"TOTALYTD":case"TOTALQTD":case"TOTALMTD":return n(e[0],this.secure(a,this.timeFilter(t.replace("TOTAL","DATES"),[e[1]],a)));default:return f(`${t}() is not pushed down to SQL`)}}}const ct=new Set(["SUM","AVERAGE","MIN","MAX","COUNT","COUNTA","COUNTROWS","DISTINCTCOUNT","MEDIAN","SUMX","AVERAGEX","MINX","MAXX","CALCULATE"]),ut=new Set(["SAMEPERIODLASTYEAR","DATEADD","DATESYTD","DATESQTD","DATESMTD","PREVIOUSYEAR","PREVIOUSQUARTER","PREVIOUSMONTH","DATESBETWEEN"]);function mt(o,t,e){const a=e.dialect??"duckdb",n=(t.groupBy??[]).map(w=>ke(o,w)),s=(t.values??[]).map(w=>ee(o,w)),r=(t.filters??[]).map(z),u=(t.highlight??[]).map(z),d=new Re(o,a),m=(w,C,k)=>{const T=(w.op==="tuples"?w.targets:[w.target]).map(D=>he(String(D)));if(w.op!=="topN")return{kind:"base",cols:T.map(x),tables:[...new Set(T.map(D=>D.table))],build:D=>d.filter(D,w,C)};const A=T[0],N=ee(o,w.by);return{kind:"base",cols:[x(A)],tables:[A.table],build:D=>{const I=k(),O=I.base.filter(M=>!M.cols.includes(x(A))),$=I.subquery(A.table,M=>`DISTINCT ${M.col(A)} AS m`,O),fe=I.value(N.ast,[...O,{kind:"group",cols:[x(A)],tables:[A.table],build:M=>I.isNotDistinct(M.col(A),"tn.m")}]);return`${D.col(A)} IN (SELECT tn.m FROM ${$} AS tn ORDER BY ${fe} ${w.direction==="bottom"?"ASC":"DESC"} NULLS LAST LIMIT ${Math.max(0,Math.floor(w.n))})`}}};let l;const h=o.activeRoleNames.length?o.toJSON().roles:{},p=new Map;for(const w of o.activeRoleNames)for(const[C,k]of Object.entries(h[w]??{}))p.set(C,[...p.get(C)??[],k]);const i=[...[...p].map(([w,C])=>({kind:"security",cols:[],tables:[w],build:k=>`(${C.map(T=>`COALESCE(${l.rowCond(k,q(T),[])}, FALSE)`).join(" OR ")})`})),...r.map(w=>m(w,r,()=>l))];l=new dt(o,e,d,a,i);const c=n.map((w,C)=>({kind:"group",cols:[x(w.column)],tables:[w.column.table],build:k=>l.isNotDistinct(k.col(w.column),`c.g${C}`)})),b=[...new Set(n.map(w=>w.column.table))],y=b.length<=1?b[0]:o.tableNames().find(w=>b.every(C=>o.expanded(w).has(C)))??f(`Grouping columns of unrelated tables (${b.join(", ")})`),v=n.map(w=>o.table(w.column.table).column(w.column.column).sortBy),R=y?l.subquery(y,w=>`DISTINCT ${[...n.map((C,k)=>`${w.col(C.column)} AS g${k}`),...v.flatMap((C,k)=>C?[`${w.col({table:n[k].column.table,column:C})} AS s${k}`]:[])].join(", ")}`,i).replace(/^\(SELECT DISTINCT/,"(SELECT DISTINCT"):"",E=(w,C)=>{const k=[...i,...w.map(S=>m(S,[...r,...w],()=>l)),...C?c:[]],T=C&&n.length>0;l.hoistTo=T?"groups":null,l.groupCount=n.length;const A=s.map(S=>l.value(S.ast,k));l.hoistTo=null;const{scalars:N,sets:D}=l.takeHoisted();if(!T)return`SELECT ${A.map((S,L)=>`${S} AS v${L}`).join(", ")||"NULL AS v0"}`;const I=[...n.map((S,L)=>`c.g${L}`),...A.map((S,L)=>`${S} AS v${L}`),...v.flatMap((S,L)=>S?[`c.s${L}`]:[])],O=a==="duckdb"?"":"MATERIALIZED ",$=N.length||D.length?[`hz AS ${O}(SELECT c.*${N.length?`, ${N.join(`,
  `)}`:""}
FROM ${R} AS c)`,...D.map(([S,L])=>`${L} AS ${O}(${S})`)]:[],M=[`${$.length?`WITH ${$.join(`,
`)}
`:""}SELECT * FROM (SELECT ${I.join(", ")}
FROM ${$.length?"hz":R} AS c) AS r`];s.length&&!t.includeEmpty&&M.push(`WHERE NOT (${s.map((S,L)=>`r.v${L} IS NULL`).join(" AND ")})`);const J=[],be=(S,L)=>`r.${v[S]?"s":"g"}${S} ${L} NULLS FIRST`;for(const S of t.orderBy??[]){const L=S.direction==="desc"?"DESC":"ASC";let _=-1,W=-1;typeof S.field=="object"?"value"in S.field?W=S.field.value:_=S.field.group:(_=n.findIndex(X=>X.ref===S.field||X.name===S.field),_<0&&(W=s.findIndex(X=>X.name===S.field||X.ref===S.field))),W>=0&&W<s.length?J.push(`r.v${W} ${L} NULLS LAST`):_>=0&&J.push(be(_,L))}n.forEach((S,L)=>J.push(be(L,"ASC"))),M.push(`ORDER BY ${J.join(", ")}`);const ye=Math.min(t.top??1/0,(t.limit??3e4)+1);return Number.isFinite(ye)&&M.push(`LIMIT ${ye}`),M.join(`
`)};return{sql:E([],!0),totals:t.totals&&s.length?E([],!1):void 0,highlight:u.length&&s.length?E(u,n.length>0):void 0,groups:n,values:s.map(({ast:w,...C})=>C),limit:n.length?t.limit??3e4:void 0,mode:"context"}}function me(o,t,e={}){Ce(t)&&f("Run visual calculations through sqlEngine (it applies them after the query)");try{return pt(o,t,e)}catch(a){if(!(a instanceof ne))throw a;return mt(o,t,e)}}function pt(o,t,e){var g,i;o.activeRoleNames.length&&f("Row-level security is applied in filter-context mode");const a=e.dialect??"duckdb",n=(t.groupBy??[]).map(c=>ke(o,c)),s=(t.values??[]).map(c=>ee(o,c)),r=(t.filters??[]).map(z),u=(t.highlight??[]).map(z),d=lt(o,s.map(c=>c.ast))??((i=(g=n[0])==null?void 0:g.column)==null?void 0:i.table)??f("Nothing to query");!s.length&&new Set(n.map(c=>c.column.table)).size>1&&f("Grouping columns of several tables without a measure");const m=new Re(o,a);for(const c of n)m.touched.add(`${c.column.table}[${c.column.column}]`);const l=(c,b)=>{const y=new ge(o,e,d,(T,A)=>m.rowExpr(T,A)),v=[...r,...c],R=b?n.map((T,A)=>`${y.col(T.column)} AS g${A}`):[],E=s.map(T=>m.value(y,T.ast,[],v)),w=v.map(T=>m.filter(y,T,v)),C=[...R,...E.map((T,A)=>`${T} AS v${A}`)],k=[`SELECT ${b&&!s.length?"DISTINCT ":""}${C.join(", ")}`,y.from()];if(w.length&&k.push(`WHERE ${w.join(" AND ")}`),b&&n.length&&s.length&&(k.push(`GROUP BY ${n.map((T,A)=>A+1).join(", ")}`),t.includeEmpty||k.push(`HAVING NOT (${E.map(T=>`${T} IS NULL`).join(" AND ")})`)),b&&n.length){const T=[];for(const N of t.orderBy??[]){const D=N.direction==="desc"?"DESC":"ASC";let I=-1,O=-1;typeof N.field=="object"?"value"in N.field?O=N.field.value:I=N.field.group:(I=n.findIndex($=>$.ref===N.field||$.name===N.field),I<0&&(O=s.findIndex($=>$.name===N.field||$.ref===N.field))),O>=0&&O<s.length?T.push(`v${O} ${D} NULLS LAST`):I>=0&&T.push(h(y,I,D))}n.forEach((N,D)=>T.push(h(y,D,"ASC"))),k.push(`ORDER BY ${T.join(", ")}`);const A=Math.min(t.top??1/0,(t.limit??3e4)+1);Number.isFinite(A)&&k.push(`LIMIT ${A}`)}return k.join(`
`)},h=(c,b,y)=>{const v=n[b].column,R=o.table(v.table).column(v.column).sortBy;return`${R?s.length?`MIN(${c.col({table:v.table,column:R})})`:c.col({table:v.table,column:R}):`g${b}`} ${y} NULLS FIRST`};return{sql:l([],!0),totals:t.totals&&s.length?l([],!1):void 0,highlight:u.length&&s.length?l(u,n.length>0):void 0,groups:n,values:s.map(({ast:c,...b})=>b),limit:n.length?t.limit??3e4:void 0,mode:"aggregate"}}function de(o,t){return o==null?null:typeof o=="bigint"?Number(o):(t==null?void 0:t.type)==="date"?rt(o)??o:o instanceof Date?o:typeof o=="string"&&t&&(t.kind==="value"||t.type==="number")&&t.type!=="string"&&o.trim()!==""&&!Number.isNaN(Number(o))?Number(o):typeof o=="object"&&o!==null&&"valueOf"in o&&typeof o.valueOf()=="number"?o.valueOf():o}const ce=(o,t,e)=>Array.isArray(o)?o[e]:o[t];function ht(o,t){const e=async(a,n)=>{const s=me(o,a,t),r=i=>{var c;return(c=t.onSql)==null||c.call(t,i),t.run(i,n)},[u,d,m]=await Promise.all([r(s.sql),s.totals?r(s.totals):null,s.highlight?r(s.highlight):null]),l=s.groups.length,h=i=>({keys:s.groups.map((c,b)=>de(ce(i,`g${b}`,b),c)),values:s.values.map((c,b)=>de(ce(i,`v${b}`,l+b),c))});let p=u.map(h);!l&&!s.values.length&&(p=[]),!l&&s.values.length&&!p.length&&(p=[{keys:[],values:s.values.map(()=>null)}]);let g=!1;if(s.limit!==void 0&&a.top===void 0&&p.length>s.limit&&(p=p.slice(0,s.limit),g=!0),m){const i=new Map(m.map(c=>{const b=h(c);return[JSON.stringify(b.keys),b.values]}));for(const c of p)c.highlights=i.get(JSON.stringify(c.keys))??s.values.map(()=>null)}return{groups:s.groups,values:s.values,rows:p,totals:d?s.values.map((i,c)=>de(ce(d[0]??{},`v${c}`,c),i)):void 0,truncated:g,baseFilters:(a.filters??[]).map(z)}};return{toSql:a=>me(o,a,t),async query(a,n){try{const s=Ce(a);return s?s.finish(await e(s.spec,n)):await e(a,n)}catch(s){if(s instanceof ne&&t.fallback==="model")return o.query(a);throw s}}}}function gt(o){return async t=>{var n;const e=await o.query(t);return(Array.isArray(e)?e:((n=e.toArray)==null?void 0:n.call(e))??[]).map(s=>s&&typeof s=="object"&&"toJSON"in s&&typeof s.toJSON=="function"?s.toJSON():s)}}const ft=Object.freeze(Object.defineProperty({__proto__:null,SqlUnsupportedError:ne,duckdbRunner:gt,sqlEngine:ht,toSql:me},Symbol.toStringTag,{value:"Module"}));function bt(o,t){const e=[];let a=o,n=o,s="";const r=t.replace(/\r\n/g,`
`).split(`
`);for(let u=0;u<r.length;u++){const d=/^(#{1,4})\s+(.*)$/.exec(r[u]);if(d){a=d[2].replace(/`/g,""),d[1].length===1&&(n=a),s="";continue}const m=/^(\s*)```(\S*)\s*(.*)$/.exec(r[u]);if(!m){r[u].trim()&&(s=r[u].trim().replace(/[:.]$/,"").replace(/[`*]/g,""));continue}const l=[];for(u++;u<r.length&&!/^\s*```\s*$/.test(r[u]);)l.push(r[u++].slice(m[1].length));/\bplayground\b/.test(m[3])&&e.push({guide:o,index:e.length,title:s.length>3&&s.length<90?s:a==="Try it"?n:a,code:l.join(`
`)}),s=""}return e}async function yt(o,t){const e=o.replace(/^\s*import\s+(?:(\{[^}]*\})|\*\s+as\s+(\w+))?\s*(?:from\s*)?['"]([^'"]+)['"];?\s*$/gm,(n,s,r,u)=>{if(!t.modules[u])throw new Error(`The playground can't import "${u}"`);const d=`__modules[${JSON.stringify(u)}]`;return s?`const ${s.replace(/\s+as\s+/g,": ")} = ${d};`:r?`const ${r} = ${d};`:""}),a=Object.getPrototypeOf(async()=>{}).constructor;return new a("__modules","model","el",e)(t.modules,t.model,t.el)}const wt={"@prismbi/prismbi":we,"@prismbi/prismbi/core":we,"@prismbi/prismbi/ai":Ne,"@prismbi/prismbi/files":st,"@prismbi/prismbi/sql":ft},vt=Object.assign({"../docs/guide/advanced-modeling.md":Ie,"../docs/guide/ai.md":xe,"../docs/guide/collab.md":Oe,"../docs/guide/connectors.md":$e,"../docs/guide/custom-visuals.md":Me,"../docs/guide/data-model.md":Ue,"../docs/guide/expressions.md":Pe,"../docs/guide/files.md":Be,"../docs/guide/frameworks.md":Fe,"../docs/guide/getting-started.md":Ve,"../docs/guide/interactions.md":je,"../docs/guide/performance.md":qe,"../docs/guide/plugins.md":_e,"../docs/guide/powerbi.md":We,"../docs/guide/react.md":Xe,"../docs/guide/server.md":Ye,"../docs/guide/sql.md":He,"../docs/guide/studio.md":Ge,"../docs/guide/theming.md":Ke,"../docs/guide/tooling.md":Qe,"../docs/guide/transforms.md":ze,"../docs/guide/visuals.md":Je}),te=Object.entries(vt).flatMap(([o,t])=>bt(o.split("/").pop().replace(/\.md$/,""),t)),V=o=>document.getElementById(o),B=V("code"),pe=V("list"),Y=V("result"),St=V("where");let U,j;const Tt=[...new Set(te.map(o=>o.guide))];for(const o of Tt){pe.append(Object.assign(document.createElement("h3"),{textContent:o.replace(/-/g," ")}));for(const t of te.filter(e=>e.guide===o)){const e=Object.assign(document.createElement("a"),{href:`#${o}/${t.index}`,textContent:t.title});e.dataset.key=`${o}/${t.index}`,pe.append(e)}}async function ae(){j==null||j(),j=void 0;const o=V("el");o.replaceChildren(),Y.textContent="",Y.classList.remove("error");const t=De();try{const e=await yt(B.value,{el:o,model:t,modules:wt});typeof e=="function"?j=e:e&&typeof e=="object"&&"destroy"in e&&typeof e.destroy=="function"?j=()=>e.destroy():e!==void 0&&(Y.textContent=typeof e=="string"?e:JSON.stringify(e,(a,n)=>n instanceof Date?n.toISOString().slice(0,10):n,2))}catch(e){Y.classList.add("error"),Y.textContent=String(e.stack??e)}}function Le(){const o=decodeURIComponent(location.hash.slice(1));if(U=te.find(t=>`${t.guide}/${t.index}`===o)??te[0],!!U){B.value=U.code,St.textContent=`${U.guide} › ${U.title}`;for(const t of pe.querySelectorAll("a"))t.toggleAttribute("aria-current",t.dataset.key===`${U.guide}/${U.index}`);ae()}}V("run").addEventListener("click",()=>void ae());V("reset").addEventListener("click",()=>U&&(B.value=U.code,void ae()));B.addEventListener("keydown",o=>{o.key==="Enter"&&(o.ctrlKey||o.metaKey)&&(o.preventDefault(),ae()),o.key==="Tab"&&(o.preventDefault(),B.setRangeText("  ",B.selectionStart,B.selectionEnd,"end"))});addEventListener("hashchange",Le);Le();
