ED Clinician Note - Chest Pain

Presentation:
{{presentation}}

{{#if triage_complaint}}Triage complaint: {{triage_complaint}}
{{/if}}{{#if chief_complaint}}Chief complaint (patient words): {{chief_complaint}}
{{/if}}

Chest pain history (OPQRST + associated symptoms):
{{#if onset}}Onset: {{onset}}
{{/if}}{{#if timing}}Timing: {{timing}}
{{/if}}{{#if provocation}}Provocation/palliation: {{provocation}}
{{/if}}{{#if quality}}Quality: {{quality}}
{{/if}}{{#if location}}Location: {{location}}
{{/if}}{{#if radiation}}Radiation: {{radiation}}
{{/if}}{{#if severity}}Severity: {{severity}}
{{/if}}
Associated symptoms:
{{#if symptom_sob}}- SOB
{{/if}}{{#if symptom_diaphoresis}}- Diaphoresis
{{/if}}{{#if symptom_nv}}- Nausea/vomiting
{{/if}}{{#if symptom_palpitations}}- Palpitations
{{/if}}{{#if symptom_syncope}}- Syncope/near-syncope
{{/if}}{{#if symptom_pleuritic}}- Pleuritic
{{/if}}{{#if symptom_positional}}- Positional
{{/if}}{{#if symptom_repro}}- Reproducible tenderness
{{/if}}{{#if symptom_fever}}- Fever/chills
{{/if}}{{#if symptom_cough}}- Cough
{{/if}}{{#if symptom_hemoptysis}}- Haemoptysis
{{/if}}{{#if symptom_neuro}}- Neuro symptoms
{{/if}}
{{#if red_flags}}Red flags: {{red_flags}}
{{/if}}{{#if risk_factors}}Risk factors: {{risk_factors}}
{{/if}}

{{obs}}

{{#if exam}}Exam:
{{exam}}

{{/if}}Primary survey (A–E):
{{#if obs.oxygen}}A: Airway – {{obs.oxygen}}
{{/if}}{{#if obs.rr}}B: Breathing – RR {{obs.rr}}
{{/if}}{{#if obs.spo2}}B: SpO2 {{obs.spo2}}%
{{/if}}{{#if obs.hr}}C: Circulation – HR {{obs.hr}}
{{/if}}{{#if obs.sbp}}C: SBP {{obs.sbp}}
{{/if}}{{#if obs.dbp}}C: DBP {{obs.dbp}}
{{/if}}{{#if obs.gcs}}D: Disability – GCS {{obs.gcs}}
{{/if}}{{#if obs.pain_score}}D: Pain score {{obs.pain_score}}/10
{{/if}}{{#if obs.bsl}}D: BSL {{obs.bsl}} mmol/L
{{/if}}{{#if obs.temp}}E: Temp {{obs.temp}} C
{{/if}}{{#if obs.appearance}}E: General appearance/distress – {{obs.appearance}}
{{/if}}

Investigations:
{{investigations}}

{{#if treatment}}Treatment in ED:
{{treatment}}

{{/if}}Assessment:
{{assessment}}

{{#if differentials}}Differentials considered:
{{differentials}}

{{/if}}Plan:
{{plan}}
