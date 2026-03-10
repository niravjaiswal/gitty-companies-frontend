const LiquidBlobs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 animate-liquid-blob animate-float"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute top-1/3 -right-24 w-72 h-72 bg-primary/5 animate-liquid-blob"
        style={{ animationDelay: "2s", animationDuration: "10s" }}
      />
      <div
        className="absolute -bottom-20 left-1/3 w-80 h-80 bg-primary/8 animate-liquid-blob animate-float"
        style={{ animationDelay: "4s", animationDuration: "12s" }}
      />
    </div>
  );
};

export default LiquidBlobs;
