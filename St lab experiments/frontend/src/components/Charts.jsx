window.EcoSort = window.EcoSort || {};

(function () {
  const { useEffect, useRef } = React;

  const WasteTrendChart = ({ series = [], darkMode = false }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current || !window.Chart) return;
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const textColor = darkMode ? '#cbd5e1' : '#334155';
      const gridColor = darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)';

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: series.map((d) => d.label),
          datasets: [
            {
              label: 'Wet Waste',
              data: series.map((d) => d.wet),
              backgroundColor: '#16a34a',
              borderRadius: 6,
            },
            {
              label: 'Dry Waste',
              data: series.map((d) => d.dry),
              backgroundColor: '#0ea5e9',
              borderRadius: 6,
            },
            {
              label: 'Metal Waste',
              data: series.map((d) => d.metal),
              backgroundColor: '#f59e0b',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: textColor, usePointStyle: true, padding: 14 },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: { color: textColor },
              grid: { display: false },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { color: textColor, precision: 0 },
              grid: { color: gridColor },
            },
          },
        },
      });

      return () => {
        if (chartRef.current) chartRef.current.destroy();
      };
    }, [series, darkMode]);

    return (
      <div className="h-72 w-full">
        <canvas ref={canvasRef} />
      </div>
    );
  };

  const WasteBreakdownDoughnut = ({ wet = 0, dry = 0, metal = 0, darkMode = false }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current || !window.Chart) return;
      if (chartRef.current) {
        chartRef.current.destroy();
      }
      const total = wet + dry + metal;
      const textColor = darkMode ? '#cbd5e1' : '#334155';

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Wet Waste', 'Dry Waste', 'Metal Waste'],
          datasets: [
            {
              data: total > 0 ? [wet, dry, metal] : [1, 1, 1],
              backgroundColor:
                total > 0
                  ? ['#16a34a', '#0ea5e9', '#f59e0b']
                  : ['rgba(148,163,184,0.25)', 'rgba(148,163,184,0.2)', 'rgba(148,163,184,0.15)'],
              borderColor: darkMode ? '#0f172a' : '#ffffff',
              borderWidth: 3,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, usePointStyle: true, padding: 14 },
            },
            tooltip: {
              enabled: total > 0,
            },
          },
        },
      });

      return () => {
        if (chartRef.current) chartRef.current.destroy();
      };
    }, [wet, dry, metal, darkMode]);

    return (
      <div className="h-72 w-full relative">
        <canvas ref={canvasRef} />
        {wet + dry + metal === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
            <span className="text-xs font-medium text-slate-400">No items classified yet</span>
          </div>
        )}
      </div>
    );
  };

  window.EcoSort.WasteTrendChart = WasteTrendChart;
  window.EcoSort.WasteBreakdownDoughnut = WasteBreakdownDoughnut;
})();

