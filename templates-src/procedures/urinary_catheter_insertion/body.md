Urinary catheter insertion note
Date: {{date}}
Time: {{time}}
Indication: {{indication}}
Catheter type: {{catheter_type}}{{#if catheter_type_other}} ({{catheter_type_other}}){{/if}}
Catheter size: {{size}}
{{#if balloon_ml}}Balloon volume: {{balloon_ml}} mL
{{/if}}
Procedure:
{{#if aseptic}}- Aseptic technique used
{{/if}}- Catheter inserted using standard technique

Outcome:
{{#if urine_return}}- Free urine return
{{/if}}{{#if urine_description}}- Urine appearance: {{urine_description}}
{{/if}}
Complications:
{{#if comp_none}}- None
{{/if}}{{#if comp_trauma}}- Traumatic insertion
{{/if}}{{#if comp_haematuria}}- Haematuria
{{/if}}{{#if comp_failed}}- Failed attempt
{{/if}}{{#if comp_other}}- Other: {{comp_other}}
{{/if}}
{{#if tolerated}}Patient tolerated procedure.
{{/if}}
Plan:
{{#if plan_monitor}}- Monitor urine output and catheter site
{{/if}}
