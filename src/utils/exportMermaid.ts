interface MermaidPrintLayout {
    contentWidthMm: number
    contentHeightMm: number
    scaleMode: 'fit-page' | 'fit-width'
    scale: number
}

// Export documents run outside the app, so the fitting code must travel with the HTML.
export function buildMermaidPrintScript(layout: MermaidPrintLayout): string {
    return `<script>
    (() => {
      const layout = ${JSON.stringify(layout)};
      const mmToPx = 96 / 25.4;
      const diagrams = Array.from(document.querySelectorAll('.mermaid-wrapper')).flatMap(wrapper => {
        const svg = wrapper.querySelector('svg');
        if (!svg) return [];
        const box = svg.viewBox && svg.viewBox.baseVal;
        const width = box && box.width || Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
        const height = box && box.height || Number(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
        if (!width || !height) return [];
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        wrapper.classList.add(layout.scaleMode === 'fit-width' ? 'mermaid-fit-width' : 'mermaid-fit-page');
        return [{ wrapper, svg, width, height }];
      });

      function fit(printing = false) {
        diagrams.forEach(({ wrapper, svg, width, height }) => {
          const style = getComputedStyle(wrapper);
          const px = value => parseFloat(value) || 0;
          const horizontalPadding = px(style.paddingLeft) + px(style.paddingRight);
          const border = px(style.borderLeftWidth) + px(style.borderRightWidth);
          const printWidth = layout.contentWidthMm * mmToPx - border;
          const availableWidth = Math.max(1, (printing ? printWidth : Math.min(wrapper.clientWidth, printWidth)) - horizontalPadding);
          // Measure the rendered remainder: labels may be inline and pre blocks add their own line box/margins.
          const chromeHeight = wrapper.getBoundingClientRect().height - svg.getBoundingClientRect().height
            + px(style.marginTop) + px(style.marginBottom);
          // Chromium rounds CSS page dimensions separately from SVG/line-box dimensions.
          const availableHeight = layout.scaleMode === 'fit-page' ? Math.max(1, (layout.contentHeightMm - 4) * mmToPx - chromeHeight) : Infinity;
          const fitScale = Math.min(1, availableWidth / width, availableHeight / height);
          const scale = Math.min(fitScale, fitScale * layout.scale);
          svg.style.setProperty('width', (width * scale) + 'px', 'important');
          svg.style.setProperty('height', (height * scale) + 'px', 'important');
          wrapper.dataset.mermaidScaled = String(scale !== 1);
        });
      }

      fit();
      window.addEventListener('beforeprint', () => fit(true));
      document.fonts.ready.then(() => fit());
    })();
  </script>`
}
