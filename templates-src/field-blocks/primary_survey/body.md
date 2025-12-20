Primary survey (A–E):
A - Airway:
{{primary_survey.a}}

B - Breathing:
{{#if obs.rr}}RR {{obs.rr}} | {{/if}}{{#if obs.spo2}}Sats {{obs.spo2}}% on {{obs.oxygen}}{{/if}}
{{primary_survey.b}}

C - Circulation:
{{#if obs.hr}}HR {{obs.hr}} BPM
{{/if}}{{#if obs.sbp && obs.dbp}}BP {{obs.sbp}}/{{obs.dbp}} (MAP {{calc (obs.sbp + 2 * obs.dbp) / 3}})
{{/if}}
{{primary_survey.c}}

D - Disability
{{#if obs.gcs}} GCS {{obs.gcs}}
{{/if}}{{#if obs.pain_score}}Pain score {{obs.pain_score}}/10
{{/if}}{{#if obs.bsl}}BSL {{obs.bsl}} mmol/L
{{/if}}{{primary_survey.d}}

E - Exposure
{{#if obs.temp}}Temp {{obs.temp}}
{{/if}}{{primary_survey.e}}
