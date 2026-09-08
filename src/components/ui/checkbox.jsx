export function Checkbox({ checked, uncheckedFill = '#D9D9D9' }) {
  return (
    <svg
      width="13"
      height="16"
      viewBox="0 0 13 16"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block shrink-0"
      aria-hidden
    >
      {checked && (
        <line
          y1="14.5"
          x2="13"
          y2="14.5"
          stroke="#FBB040"
          strokeWidth="3"
        />
      )}
      <rect
        width="13"
        height="13"
        fill={checked ? '#FAD47F' : uncheckedFill}
      />
    </svg>
  )
}
