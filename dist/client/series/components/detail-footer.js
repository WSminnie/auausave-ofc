(() => {
  const C = SeriesFeature.components;
  C.detailFooter = () => `<footer class="series-detail-footer"><div class="series-footer-container">
    <div class="series-creator-row"><h2>Website created by</h2><div class="series-creator-links">
      <a class="series-creator-link creator-pair" href="https://x.com/AuauSaveHouseTH" target="_blank" rel="noopener noreferrer">@AuauSaveHouseTH</a>
      <a class="series-creator-link creator-auau" href="https://x.com/AUAUTNPOFC" target="_blank" rel="noopener noreferrer">@AUAUTNPOFC</a>
      <a class="series-creator-link creator-save" href="https://x.com/SAVEWRG_OFC" target="_blank" rel="noopener noreferrer">@SAVEWRG_OFC</a>
    </div></div><div class="series-footer-meta"><span>© ${new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date())} AUAUSAVE TH</span><span>MADE FOR EVERY FAN <span class="series-footer-heart" aria-hidden="true"></span></span></div>
  </div></footer>`;
})();
