import React, { useEffect, useState, useRef } from "react";

const NumberAnimation: React.FC = () => {
  const [value, setValue] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startAnimation = () => {
      let current = 0;
      setValue(current);

      intervalRef.current = setInterval(() => {
        current = parseFloat((current + 0.01).toFixed(2));

        if (current >= 2.14) {
          clearInterval(intervalRef.current!);
          setValue(2.14);

          // 5초 후 다시 시작
          setTimeout(() => {
            startAnimation();
          }, 6400);
        } else {
          setValue(current);
        }
      }, 10); // 0.1초 간격
    };

    startAnimation();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex items-center justify-center">{value.toFixed(2)}s</div>
  );
};

export default NumberAnimation;
