// Демо-режим включён по умолчанию: кнопка «Демо: создать дегустацию» и блок «Демо» на главной.
// Отключить на боевом сайте: NEXT_PUBLIC_SHOW_DEMO=false.

export const showDemo = () => process.env.NEXT_PUBLIC_SHOW_DEMO !== "false";
