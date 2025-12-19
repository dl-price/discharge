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

Vital signs:
{{#if hr}}HR: {{hr}}
{{/if}}{{#if sbp}}SBP: {{sbp}}
{{/if}}{{#if dbp}}DBP: {{dbp}}
{{/if}}{{#if rr}}RR: {{rr}}
{{/if}}{{#if spo2}}SpO2: {{spo2}}%
{{/if}}{{#if temp}}Temp: {{temp}} C
{{/if}}{{#if pain_score}}Pain score: {{pain_score}}/10
{{/if}}{{#if gcs}}GCS: {{gcs}}
{{/if}}{{#if bsl}}BSL: {{bsl}} mmol/L
{{/if}}{{#if oxygen}}Oxygen: {{oxygen}}
{{/if}}{{#if appearance}}General appearance/distress: {{appearance}}
{{/if}}

{{#if exam}}Exam:
{{exam}}

{{/if}}Primary survey (A–E):
{{#if oxygen}}A: Airway – {{oxygen}}
{{/if}}{{#if rr}}B: Breathing – RR {{rr}}
{{/if}}{{#if spo2}}B: SpO2 {{spo2}}%
{{/if}}{{#if hr}}C: Circulation – HR {{hr}}
{{/if}}{{#if sbp}}C: SBP {{sbp}}
{{/if}}{{#if dbp}}C: DBP {{dbp}}
{{/if}}{{#if gcs}}D: Disability – GCS {{gcs}}
{{/if}}{{#if pain_score}}D: Pain score {{pain_score}}/10
{{/if}}{{#if bsl}}D: BSL {{bsl}} mmol/L
{{/if}}{{#if temp}}E: Temp {{temp}} C
{{/if}}{{#if appearance}}E: General appearance/distress – {{appearance}}
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
