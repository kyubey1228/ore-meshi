export const AREA_DATALIST_ID = 'area-options';

// input list="area-options" と組み合わせて使う入力補助。件数表示はせず候補名のみを出す。
// 自由入力を妨げないsuggestionなので、ここに無い値(丁目・商店街名などを含む自由記述)もそのまま送信できる。
export function AreaDatalist({ options }: { options: string[] }) {
  return (
    <datalist id={AREA_DATALIST_ID}>
      {options.map(option => <option key={option} value={option} />)}
    </datalist>
  );
}
