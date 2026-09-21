/* Adapt the existing cropper without adding another image processing pipeline. */
(() => {
  const S = SeriesFeature;
  let installed = false;
  const preset = field => field.startsWith('series_row_')
    ? { canChoose: false, orientation: 'square', ratio: 1, shape: 'series-character', label: 'Character · 1:1' }
    : field === 'banner_url'
      ? { canChoose: false, orientation: 'landscape', ratio: 3, shape: 'video', label: 'Banner · 3:1' }
      : { canChoose: false, orientation: 'landscape', ratio: 16 / 9, shape: 'video', label: 'Image · 16:9' };
  function install() {
    if (installed) return;
    installed = true;
    const originalPreset = imageCropPreset, originalOpen = openCropImage, originalDraw = drawCropPreview;
    imageCropPreset = function(field) {
      return document.querySelector('#modal .series-admin-modal') ? preset(field) : originalPreset(field);
    };
    drawCropPreview = function() {
      originalDraw();
      if (cropImageState?.input.closest('.series-admin-modal')) {
        const label = document.querySelector('#cropRatioLabel');
        if (label) label.textContent = cropImageState.preset.label;
      }
    };
    openCropImage = function(input, field, image, settings) {
      originalOpen(input, field, image, settings);
      if (!input.closest('.series-admin-modal')) return;
      const crop = document.querySelector('#cropImageModal');
      crop.setAttribute('role', 'dialog');
      crop.setAttribute('aria-modal', 'true');
      crop.setAttribute('aria-label', 'Adjust image');
      crop.querySelector('h2').textContent = 'Adjust image';
      crop.querySelector('.modal-head p').textContent = 'Drag the image or use the controls to adjust the crop.';
      crop.querySelector('.close').setAttribute('aria-label', 'Close image editor');
      ['Zoom', 'Move horizontally', 'Move vertically'].forEach((label, index) => {
        crop.querySelectorAll('.crop-controls label span')[index].textContent = label;
      });
      const buttons = crop.querySelectorAll('.form-actions button');
      buttons[0].textContent = 'Cancel';
      buttons[1].textContent = 'Use image';
      crop.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeCropImage(); input.focus(); }
        if (event.key !== 'Tab') return;
        const controls = [...crop.querySelectorAll('button, input')], first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
      crop.querySelector('.close').focus();
    };
  }
  S.images = { install, preset };
})();
