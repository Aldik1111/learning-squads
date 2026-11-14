export const languages = [
  {code:"en",name:"English"}, {code:"es",name:"Spanish"}, {code:"fr",name:"French"},
  {code:"ru",name:"Russian"}, {code:"kk",name:"Kazakh"}, {code:"de",name:"German"},
  {code:"pt",name:"Portuguese"}, {code:"it",name:"Italian"}, {code:"zh",name:"Chinese"},
  {code:"ja",name:"Japanese"}, {code:"ar",name:"Arabic"}, {code:"hi",name:"Hindi"},
  {code:"ko",name:"Korean"}, {code:"tr",name:"Turkish"}, {code:"uk",name:"Ukrainian"},
  {code:"pl",name:"Polish"}, {code:"nl",name:"Dutch"}, {code:"id",name:"Indonesian"},
  {code:"vi",name:"Vietnamese"}, {code:"uz",name:"Uzbek"},
] as const;

export function languageName(code:string) {
  return languages.find(language=>language.code===code)?.name ?? `Saved language (${code})`;
}
export function otherLanguages(codes:readonly string[],primary:string) {
  return [...new Set(codes)].filter(code=>code!==primary);
}
