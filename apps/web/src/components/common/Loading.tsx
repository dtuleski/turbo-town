const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-light">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        <p className="mt-4 text-text-secondary">Loading...</p>
      </div>
    </div>
  )
}

export default Loading
