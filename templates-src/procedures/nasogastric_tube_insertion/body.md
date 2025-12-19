Nasogastric tube insertion note
Date: {{date}}
Time: {{time}}
Indication: {{indication}}
Tube size: {{tube_size}}
Nostril: {{nostril}}
{{#if length_cm}}Length inserted: {{length_cm}} cm
{{/if}}
Procedure:
- Tube inserted using lubrication and standard technique

Confirmation of placement:
{{#if confirm_aspirate}}- Aspirate obtained
{{/if}}{{#if confirm_ph}}- pH testing performed
{{/if}}{{#if confirm_xray}}- X-ray confirmation
{{/if}}
Complications:
{{#if comp_none}}- None
{{/if}}{{#if comp_epistaxis}}- Epistaxis
{{/if}}{{#if comp_coiling}}- Coiling
{{/if}}{{#if comp_failed}}- Failed attempt
{{/if}}{{#if comp_other}}- Other: {{comp_other}}
{{/if}}
{{#if tolerated}}Patient tolerated procedure.
{{/if}}
Plan:
{{#if plan_ready}}- Tube ready for use
{{/if}}
