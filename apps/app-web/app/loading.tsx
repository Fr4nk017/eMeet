export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="h-[3px] w-full overflow-hidden bg-white/5">
        <div className="h-full w-1/3 animate-[routeLoading_1.1s_ease-in-out_infinite] bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
      </div>
    </div>
  )
}
