Peripheral IV cannula insertion note
{{#if indication}}Indication: {{indication}}{{/if}}
Site: {{site}}{{#if side}} ({{side}}){{/if}}
Cannula size: {{gauge}}
{{#if attempts}}Number of attempts: {{attempts}}
{{/if}}
Procedure:
{{#if aseptic}}- Aseptic technique used
{{/if}}{{#if local_anaesthetic}}- Local anaesthetic used
{{/if}}- Cannula inserted using standard technique
{{#if blood_return}}- Blood return obtained
{{/if}}Blood bottles taken:
{{#if blood_bottle_edta}}- EDTA
{{/if}}{{#if blood_bottle_sst}}- SST
{{/if}}{{#if blood_bottle_rst}}- RST
{{/if}}{{#if blood_bottle_citrate}}- Citrate
{{/if}}{{#if flush_patent}}- Flushed and patent
{{/if}}{{#if secured}}- Secured with dressing
{{/if}}
Complications:
{{#if comp_none}}- None
{{/if}}{{#if comp_arterial}}- Suspected arterial puncture
{{/if}}{{#if comp_haematoma}}- Haematoma
{{/if}}{{#if comp_infiltration}}- Infiltration/extravasation
{{/if}}{{#if comp_other}}- Other: {{comp_other}}
{{/if}}
{{#if tolerated}}Patient tolerated procedure.
{{/if}}
