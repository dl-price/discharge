Ultrasound-guided cannula insertion - Procedure note
Date: {{date}}
Time: {{time}}
Location: {{location}}

Indication:
{{#if indication_difficult}}- Difficult IV access
{{/if}}{{#if indication_obesity}}- Obesity
{{/if}}{{#if indication_oedema}}- Oedema
{{/if}}{{#if indication_ivdu}}- IV drug use
{{/if}}{{#if indication_chronic}}- Chronic illness / chemotherapy
{{/if}}{{#if indication_other}}- Other: {{indication_other}}
{{/if}}
Consent:
{{#if consent_verbal}}- Verbal consent obtained
{{/if}}{{#if consent_implied}}- Emergency / implied consent
{{/if}}
Risks explained:
{{#if risk_pain}}- Pain
{{/if}}{{#if risk_bleeding}}- Bleeding
{{/if}}{{#if risk_infection}}- Infection
{{/if}}{{#if risk_extravasation}}- Extravasation
{{/if}}{{#if risk_arterial}}- Arterial puncture
{{/if}}{{#if questions_answered}}Patient questions answered
{{/if}}
Operator:
Clinician: {{clinician}}
Grade: {{grade}}
Assistant: {{assistant}}

Pre-procedure checks:
{{#if check_identity}}- Patient identity confirmed
{{/if}}{{#if check_allergies}}- Allergies checked
{{/if}}{{#if check_indication}}- Indication confirmed
{{/if}}{{#if check_equipment}}- Equipment prepared
{{/if}}{{#if check_aseptic}}- Aseptic technique used
{{/if}}
Ultrasound details:
Machine: {{machine}}
Probe: {{probe}}
Probe cover used: {{probe_cover}}
Gel: {{gel_type}}
{{#if vessel_vein}}Vessel identified: Vein (compressible, non-pulsatile)
{{/if}}{{#if depth_mm}}Depth: {{depth_mm}} mm
{{/if}}
Cannula details:
Site: {{site}}{{#if site_other}} ({{site_other}}){{/if}}
Side: {{side}}
Cannula size: {{cannula_size}}
Approach: {{approach}}
{{#if attempts}}Number of attempts: {{attempts}}
{{/if}}
Procedure:
- Skin cleaned with antiseptic and allowed to dry
- Ultrasound used to visualise target vein
- Needle advanced under real-time ultrasound guidance
- Successful venous entry visualised
- Cannula advanced and needle withdrawn

Confirmation of placement:
{{#if confirm_blood}}- Free aspiration of venous blood
{{/if}}{{#if confirm_flush}}- Flushes easily with saline
{{/if}}{{#if confirm_swelling}}- No swelling or pain on flushing
{{/if}}{{#if confirm_ultrasound}}- Ultrasound confirmation of intravascular position
{{/if}}
Complications:
{{#if comp_none}}- None
{{/if}}{{#if comp_arterial}}- Arterial puncture
{{/if}}{{#if comp_haematoma}}- Haematoma
{{/if}}{{#if comp_extravasation}}- Extravasation
{{/if}}{{#if comp_failed}}- Failed attempt
{{/if}}{{#if comp_other}}- Other: {{comp_other}}
{{/if}}
Post-procedure:
{{#if post_secured}}- Cannula secured and dressed
{{/if}}{{#if post_labelled}}- Labelled with date/time
{{/if}}{{#if post_tolerated}}- Patient tolerated procedure well
{{/if}}{{#if post_advice}}- Post-procedure advice given
{{/if}}
Plan:
{{#if plan_ready}}- Cannula ready for use
{{/if}}{{#if plan_monitor}}- Monitor site for infiltration or complications
{{/if}}
