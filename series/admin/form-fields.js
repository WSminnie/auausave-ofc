(() => {
  const S = SeriesFeature, e = S.components.e;
  const field = (name, label, value = '', type = 'text', required = false) => `<label class="field"><span>${e(label)}</span><input name="${e(name)}" type="${type}" value="${e(value)}" ${required ? 'required' : ''} ${type === 'number' ? 'step="1"' : ''}></label>`;
  const area = (name, label, value = '') => `<label class="field full"><span>${e(label)}</span><textarea name="${e(name)}" rows="3">${e(value)}</textarea></label>`;
  const select = (name, label, options, value) => `<label class="field"><span>${e(label)}</span><select name="${name}">${options.map(option => `<option value="${e(option.value ?? option)}" ${(option.value ?? option) === value ? 'selected' : ''}>${e(option.label ?? option)}</option>`).join('')}</select></label>`;
  // Keep the existing resizing and upload implementation, translating its static copy.
  const image = (name, label, value) => imageUploadTemplate(name, label, value || '').replace('<input type="file"', `<input aria-label="${e(label)}" type="file"`).replace('เลือกรูปภาพ', 'Choose image').replace('รองรับ JPG, PNG, WebP · ระบบจะย่อรูปให้อัตโนมัติ', 'JPG, PNG or WebP · Images resize automatically').replace('ลบรูปนี้', 'Remove image');
  const common = () => '';
  const parent = (item, rows) => select('series_id', 'Series', rows.map(row => ({ value: row.id, label: row.title_en })), item.series_id || rows[0]?.id);
  S.fields = { field, area, select, image, common, parent };
})();
