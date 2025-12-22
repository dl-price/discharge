Fascia iliaca block note
{{#if time}}
Time: {{time}}
{{/if}}
Indication: {{indication}}
Side: {{side}}
- Confirmed by: {{side_confirmed}}
Consent: {{consent}}
{{#if ultrasound_guided}}Ultrasound-guided: Yes
{{/if}}{{#if agent}}Local anaesthetic: {{agent}}{{/if}}{{#if volume_ml}} ({{volume_ml}} mL){{/if}}
{{#if technique}}Technique: {{technique}}
{{/if}}
Complications:
{{#if comp_none}}- None
{{/if}}{{#if comp_toxicity}}- Local anaesthetic systemic toxicity
{{/if}}{{#if comp_hematoma}}- Haematoma
{{/if}}{{#if comp_failed}}- Failed block
{{/if}}{{#if comp_other}}- Other: {{comp_other}}
{{/if}}
{{#if tolerated}}Patient tolerated procedure.
{{/if}}
  {{#if bp_readings}}BP readings:
  {{#each bp_readings}}- {{#if this.bp_time}}{{this.bp_time}}: {{/if}}{{this.sbp}}/{{this.dbp}}
  {{/each}}