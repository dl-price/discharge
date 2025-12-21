# Emergency Department Discharge Summary

This patient presented to the ED with:
{{presenting_problem}}

On review:
{{review_summary}}

Relevant investigations showed:
{{#bullets investigations}}

The following treatment was undertaken whilst in ED:
{{#bullets treatment}}

I have recommended the following:
{{#bullets recommendations}}

{{#if outstanding_investigations}}
Could you please review the results of the following outstanding investigations:
{{#bullets outstanding_investigations}}
{{/if}}

I have asked the patient to follow up with you or represent to ED in case of the following red flags or ongoing concerns:
{{#bullets red_flags}}

