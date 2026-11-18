/* Prepare Hero typography independently of the background media transfer. */
(()=>{
 const style=document.querySelector('link[href="/assets/estate.css"]');
 const stylesReady=style?.sheet?Promise.resolve():new Promise((resolve,reject)=>{style?.addEventListener('load',resolve,{once:true});style?.addEventListener('error',reject,{once:true});});
 let typeTimer;
 window.__heroTypeReady=Promise.race([
  stylesReady.then(()=>Promise.all([
   document.fonts.load('700 32px Onest','Недвижимость Spain 123'),
   document.fonts.load('400 15px Manrope','Мы собрали Spain 123'),
   document.fonts.load('600 14px Manrope','ВЫБРАТЬ РЕГИОН Spain 123')
  ])).then(()=>document.fonts.ready),
  new Promise((_,reject)=>{typeTimer=setTimeout(()=>reject(Error('critical_fonts_timeout')),8000);})
 ]).then(()=>{if(window.__heroTypeFrozen)return false;window.__heroTypeLoaded=true;document.documentElement.dataset.heroFonts='ready';return true;})
  .catch(()=>{document.documentElement.dataset.heroFonts='fallback';return false;})
  .finally(()=>{clearTimeout(typeTimer);window.dispatchEvent(new Event('sp:hero-type-ready'));});
 window.dispatchEvent(new Event('sp:cinema-loader'));
})();
