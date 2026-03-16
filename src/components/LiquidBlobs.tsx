const LiquidBlobs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-drift"
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-drift"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full bg-primary/8 blur-3xl animate-drift"
        style={{ animationDelay: "6s" }}
      />
    </div>
  );
};

export default LiquidBlobs;
