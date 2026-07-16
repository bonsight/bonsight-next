const TAG_TYPE_MAP = {
  GA4_CONFIG: 'googtag',
  GA4_EVENT: 'gaawe',
  CUSTOM_HTML: 'html',
  CUSTOM_IMAGE: 'img',
  CONVERSION_LINKER: 'cl',
};

const TRIGGER_TYPE_MAP = {
  PAGEVIEW: 'PAGEVIEW',
  DOM_READY: 'DOM_READY',
  WINDOW_LOADED: 'WINDOW_LOADED',
  FORM_SUBMIT: 'FORM_SUBMISSION',
  CUSTOM_EVENT: 'CUSTOM_EVENT',
  CLICK: 'LINK_CLICK',
};

export function generateGtmContainer(data) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const accountId = '0';
  const containerId = '0';
  let tagId = 1;
  let triggerId = 1;
  let variableId = 1;

  const triggerIdMap = {};

  const triggers = (data.triggers ?? []).map((t) => {
    const id = String(triggerId++);
    triggerIdMap[t.name] = id;
    const base = { accountId, containerId, triggerId: id, name: t.name };

    if (t.triggerType === 'CUSTOM_EVENT') {
      return {
        ...base, type: 'CUSTOM_EVENT',
        customEventFilter: [{
          type: 'EQUALS',
          parameter: [
            { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
            { type: 'TEMPLATE', key: 'arg1', value: t.eventName ?? t.name },
          ],
        }],
      };
    }
    if (t.triggerType === 'CLICK') {
      const trigger = { ...base, type: 'LINK_CLICK', waitForTags: { type: 'BOOLEAN', key: 'waitForTags', value: 'false' } };
      if (t.filters?.length) {
        trigger.filter = t.filters.map((f) => ({
          type: f.type ?? 'CONTAINS',
          parameter: [
            { type: 'TEMPLATE', key: 'arg0', value: f.parameter ?? '{{Click URL}}' },
            { type: 'TEMPLATE', key: 'arg1', value: f.value ?? '' },
          ],
        }));
      }
      return trigger;
    }
    return { ...base, type: TRIGGER_TYPE_MAP[t.triggerType] ?? 'PAGEVIEW' };
  });

  const variables = (data.variables ?? []).map((v) => {
    const id = String(variableId++);
    const base = { accountId, containerId, variableId: id, name: v.name };
    if (v.varType === 'DATA_LAYER') {
      return {
        ...base, type: 'v',
        parameter: [
          { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
          { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
          { type: 'TEMPLATE', key: 'name', value: v.parameter ?? v.name },
        ],
      };
    }
    if (v.varType === 'CONSTANT') {
      return { ...base, type: 'c', parameter: [{ type: 'TEMPLATE', key: 'value', value: v.parameter ?? '' }] };
    }
    if (v.varType === 'URL') {
      return { ...base, type: 'u', parameter: [{ type: 'TEMPLATE', key: 'component', value: v.parameter ?? 'URL' }] };
    }
    if (v.varType === 'JS_VAR') {
      return {
        ...base, type: 'jsm',
        parameter: [{ type: 'TEMPLATE', key: 'javascript', value: `function() { return ${v.parameter ?? 'undefined'}; }` }],
      };
    }
    return { ...base, type: 'v', parameter: [{ type: 'TEMPLATE', key: 'name', value: v.parameter ?? v.name }] };
  });

  const tags = (data.tags ?? []).map((t) => {
    const id = String(tagId++);
    const firingTriggerId = (t.triggerNames ?? [])
      .map((n) => triggerIdMap[n])
      .filter(Boolean);
    const base = { accountId, containerId, tagId: id, name: t.name, firingTriggerId, tagFiringOption: 'ONCE_PER_EVENT', monitoringMetadata: { type: 'MAP' } };

    if (t.tagType === 'GA4_CONFIG') {
      const mid = t.parameters?.find((p) => p.key === 'measurementId')?.value ?? '';
      return { ...base, type: 'googtag', parameter: [{ type: 'TEMPLATE', key: 'id', value: mid }] };
    }

    if (t.tagType === 'GA4_EVENT') {
      const eventName = t.parameters?.find((p) => p.key === 'eventName')?.value ?? '';
      const configTagName = t.parameters?.find((p) => p.key === 'configTagName')?.value ?? '';
      const eventParams = (t.parameters ?? []).filter((p) => !['eventName', 'configTagName'].includes(p.key));
      const parameter = [
        { type: 'TEMPLATE', key: 'eventName', value: eventName },
        ...(configTagName ? [{ type: 'TAG_REFERENCE', key: 'measurementId', value: configTagName }] : []),
      ];
      if (eventParams.length) {
        parameter.push({
          type: 'LIST', key: 'eventParameters',
          list: eventParams.map((p) => ({
            type: 'MAP',
            map: [
              { type: 'TEMPLATE', key: 'name', value: p.key },
              { type: 'TEMPLATE', key: 'value', value: p.value },
            ],
          })),
        });
      }
      return { ...base, type: 'gaawe', parameter };
    }

    if (t.tagType === 'CUSTOM_HTML') {
      const html = t.parameters?.find((p) => p.key === 'html')?.value ?? '';
      return { ...base, type: 'html', parameter: [{ type: 'TEMPLATE', key: 'html', value: html }, { type: 'BOOLEAN', key: 'supportDocumentWrite', value: 'false' }] };
    }

    return { ...base, type: TAG_TYPE_MAP[t.tagType] ?? 'html', parameter: [] };
  });

  return {
    exportFormatVersion: 2,
    exportTime: now,
    containerVersion: {
      path: `accounts/${accountId}/containers/${containerId}/versions/0`,
      accountId,
      containerId,
      publicId: 'GTM-ARIA',
      name: data.title ?? 'Aria Generated Container',
      description: data.description ?? '',
      tag: tags,
      trigger: triggers,
      variable: variables,
      folder: [],
      builtInVariable: [
        { accountId, containerId, type: 'PAGE_URL', name: 'Page URL' },
        { accountId, containerId, type: 'PAGE_HOSTNAME', name: 'Page Hostname' },
        { accountId, containerId, type: 'PAGE_PATH', name: 'Page Path' },
        { accountId, containerId, type: 'REFERRER', name: 'Referrer' },
        { accountId, containerId, type: 'EVENT', name: 'Event' },
        { accountId, containerId, type: 'CLICK_ELEMENT', name: 'Click Element' },
        { accountId, containerId, type: 'CLICK_CLASSES', name: 'Click Classes' },
        { accountId, containerId, type: 'CLICK_ID', name: 'Click ID' },
        { accountId, containerId, type: 'CLICK_TARGET', name: 'Click Target' },
        { accountId, containerId, type: 'CLICK_URL', name: 'Click URL' },
        { accountId, containerId, type: 'CLICK_TEXT', name: 'Click Text' },
      ],
    },
  };
}
