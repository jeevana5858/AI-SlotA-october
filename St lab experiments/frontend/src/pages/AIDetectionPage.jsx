window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect, useRef } = React;

  const AIDetectionPage = ({ onUserUpdate, onRefreshNotifs }) => {
    const { api, taxonomy, Icon, CategoryIcon } = window.EcoSort;
    const [modelState, setModelState] = useState('loading'); // 'loading' | 'ready' | 'unavailable'
    const [modelReason, setModelReason] = useState('');
    const [demoSamples, setDemoSamples] = useState([]);

    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    const [classifying, setClassifying] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [rawPreds, setRawPreds] = useState([]);
    const [bins, setBins] = useState([]);
    const [sortingConfirmation, setSortingConfirmation] = useState('');
    const [binAlert, setBinAlert] = useState('');

    const imgRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
      let mounted = true;

      // Fetch bins & taxonomy/demo info
      api.get('/api/bins').then((res) => {
        if (mounted) setBins(res.bins || []);
      }).catch(() => {});

      api.get('/api/ai/status').then((res) => {
        if (mounted && res.taxonomy?.demo_samples) {
          setDemoSamples(res.taxonomy.demo_samples);
        }
      }).catch(() => {});

      // Attempt to load real MobileNetV2 model
      taxonomy
        .ensureModel()
        .then(() => {
          if (mounted) setModelState('ready');
        })
        .catch((err) => {
          if (mounted) {
            setModelState('unavailable');
            setModelReason(err.message || 'MobileNetV2 weights could not be loaded.');
          }
        });

      return () => {
        mounted = false;
        stopCamera();
      };
    }, []);

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    };

    const startCamera = async () => {
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (err) {
        setError('Unable to access camera. Please allow camera permission or upload an image file.');
      }
    };

    const capturePhoto = () => {
      if (!videoRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewUrl(dataUrl);
      setSelectedFile(null);
      setResult(null);
      setSortingConfirmation('');
      setBinAlert('');
      stopCamera();
    };

    const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      stopCamera();
      setError('');
      setResult(null);
      setSortingConfirmation('');
      setBinAlert('');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    };

    const handleClassifyAndSort = async () => {
      if (!previewUrl) {
        setError('Please upload an image or capture one with your camera first.');
        return;
      }
      setError('');
      setClassifying(true);
      setSortingConfirmation('');
      setBinAlert('');

      try {
        // Wait briefly to ensure img element is decoded
        const imgEl = imgRef.current;
        if (!imgEl || !imgEl.complete) {
          throw new Error('Image is still loading. Please try again.');
        }

        const aiRes = await taxonomy.classifyImageElement(imgEl);
        if (!aiRes.available) {
          setModelState('unavailable');
          setModelReason(aiRes.reason || 'MobileNetV2 model unavailable.');
          setError(
            'MobileNetV2 AI model is currently unavailable (offline or blocked). ' +
              'We do not fake AI predictions — please use the clearly labelled Demo Mode samples below.'
          );
          setClassifying(false);
          return;
        }

        setRawPreds(aiRes.raw_predictions || []);

        const fd = new FormData();
        if (selectedFile) {
          fd.append('image', selectedFile);
        } else {
          fd.append('image_data', previewUrl);
        }
        fd.append('predicted_category', aiRes.predicted_category);
        fd.append('detected_label', aiRes.detected_label);
        fd.append('confidence', String(aiRes.confidence));
        fd.append('model_source', aiRes.model_source);
        fd.append('is_demo', 'false');

        const saved = await api.post('/api/ai/classify', fd);
        setResult(saved.classification);
        setBins(saved.bins || []);
        setSortingConfirmation(saved.sorting_confirmation || '');
        setBinAlert(saved.bin_alert || '');
        if (onUserUpdate && saved.user) onUserUpdate(saved.user);
        if (onRefreshNotifs) onRefreshNotifs();
      } catch (err) {
        setError(err.message);
      } finally {
        setClassifying(false);
      }
    };

    const handleDemoSample = async (sample) => {
      setError('');
      setClassifying(true);
      setSortingConfirmation('');
      setBinAlert('');
      setRawPreds([]);
      try {
        const saved = await api.post('/api/ai/classify', {
          predicted_category: sample.category,
          detected_label: sample.detected_label,
          confidence: sample.confidence,
          is_demo: true,
          model_source: 'Demo Mode (Model Unavailable)',
        });
        setResult({ ...saved.classification, is_demo: true });
        setBins(saved.bins || []);
        setSortingConfirmation(saved.sorting_confirmation || '');
        setBinAlert(saved.bin_alert || '');
        if (onUserUpdate && saved.user) onUserUpdate(saved.user);
        if (onRefreshNotifs) onRefreshNotifs();
      } catch (err) {
        setError(err.message);
      } finally {
        setClassifying(false);
      }
    };

    const resultMeta = result ? taxonomy.CATEGORY_META[result.predicted_category] : null;

    return (
      <div className="space-y-6">
        {/* AI Model Status Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              AI Waste Detection & Smart Segregation
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Upload a waste photo or capture via webcam for real-time MobileNetV2 classification and automatic bin assignment.
            </p>
          </div>
          <div>
            {modelState === 'loading' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Loading MobileNetV2 Model...
              </span>
            )}
            {modelState === 'ready' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-eco-100 text-eco-800 dark:bg-eco-900/40 dark:text-eco-300">
                <span className="w-2 h-2 rounded-full bg-eco-500" />
                MobileNetV2 Model Ready
              </span>
            )}
            {modelState === 'unavailable' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                <Icon name="alert" className="w-4 h-4" />
                Demo Mode (AI Model Unavailable)
              </span>
            )}
          </div>
        </div>

        {modelState === 'unavailable' && (
          <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200 text-sm">
            <strong>Demo Mode Notice:</strong> Live MobileNetV2 inference is unavailable ({modelReason}).
            No fake AI predictions will be generated for uploaded images. You can test the complete smart bin sorting workflow using the clearly labelled <strong>Demo Mode</strong> samples below.
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Main 2-Column Detection & Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload / Camera Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-eco-700 hover:bg-eco-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Icon name="upload" className="w-4 h-4" />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-eco-600 text-eco-700 dark:text-eco-400 hover:bg-eco-50 dark:hover:bg-slate-800 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon name="camera" className="w-4 h-4" />
                  Use Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                >
                  Stop Camera
                </button>
              )}
            </div>

            <div className="relative h-72 rounded-2xl border-2 border-dashed border-eco-200 dark:border-slate-700 bg-eco-50/40 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
              {cameraActive ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-3 px-5 py-2 rounded-full bg-eco-500 hover:bg-eco-600 text-white font-semibold text-sm shadow-lg"
                  >
                    Capture Snapshot
                  </button>
                </div>
              ) : previewUrl ? (
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Waste preview"
                  crossOrigin="anonymous"
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center p-6">
                  <Icon name="camera" className="w-10 h-10 text-eco-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Upload a waste photo or start your camera
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports food waste, paper, cardboard, plastic bottles, aluminium cans & metal items
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleClassifyAndSort}
              disabled={!previewUrl || classifying || modelState === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-eco-700 to-emerald-600 hover:from-eco-800 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {classifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running MobileNetV2 & Sorting...
                </>
              ) : (
                'Identify Waste & Auto-Assign Smart Bin'
              )}
            </button>
          </div>

          {/* Classification Result Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            {!result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-eco-50 dark:bg-slate-800 flex items-center justify-center text-eco-600 mb-3">
                  <Icon name="recycle" className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-lg">Awaiting Waste Image</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Once classified, you will see the predicted waste category, confidence score, disposal instructions, and automatic bin assignment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${resultMeta?.badgeBg}`}>
                      <CategoryIcon category={result.predicted_category} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Predicted Category
                        </span>
                        {result.is_demo && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                            DEMO MODE
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                        {result.predicted_category}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Confidence</div>
                    <div className="text-2xl font-extrabold text-eco-700 dark:text-eco-400">
                      {result.confidence}%
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detected Object:</span>
                    <span className="font-semibold capitalize">{result.detected_label}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">AI Model:</span>
                    <span className="font-medium text-xs">{result.model_source}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Eco Points Awarded:</span>
                    <span className="font-bold text-eco-700 dark:text-eco-400">+{result.points} pts</span>
                  </div>
                </div>

                {rawPreds.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500 uppercase">MobileNetV2 Top Predictions</div>
                    {rawPreds.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-600 dark:text-slate-300 truncate">{p.label}</span>
                        <span className="font-mono font-semibold">{(p.probability * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-eco-50 dark:bg-eco-950/50 border border-eco-200 dark:border-eco-800">
                  <div className="text-xs font-bold uppercase text-eco-800 dark:text-eco-300 mb-1">
                    Disposal Instructions
                  </div>
                  <p className="text-sm text-eco-950 dark:text-eco-100 leading-relaxed">
                    {result.disposal_instructions}
                  </p>
                </div>

                {sortingConfirmation && (
                  <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow">
                    ✓ {sortingConfirmation}
                  </div>
                )}

                {binAlert && (
                  <div className="p-3.5 rounded-2xl bg-red-600 text-white text-sm font-semibold">
                    ⚠ {binAlert}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clearly Labelled Demo Mode Samples */}
        {demoSamples.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display font-bold text-base">
                  Demo Mode Test Samples (Clearly Labelled)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use these labelled samples when testing without a camera or when the MobileNetV2 model is unavailable.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                DEMO MODE SAMPLES
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {demoSamples.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={classifying}
                  onClick={() => handleDemoSample(s)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-eco-500 bg-slate-50 dark:bg-slate-800/60 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-eco-700 dark:text-eco-400">{s.category}</span>
                    <span className="text-[11px] text-slate-400">Demo</span>
                  </div>
                  <div className="font-semibold text-sm mt-1">{s.title}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart Waste Segregation 3-Bin Visual Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-1">Smart Segregation Bins (Live Auto-Assignment)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Detected items are automatically routed into the corresponding smart bin below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bins.map((b) => {
              const isHighlighted = result && result.predicted_category === b.category;
              const meta = taxonomy.CATEGORY_META[b.category] || {};
              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    isHighlighted
                      ? 'border-eco-500 bg-eco-50/70 dark:bg-eco-950/40 shadow-lg scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${meta.badgeBg}`}>
                        <CategoryIcon category={b.category} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{b.label}</div>
                        <div className="text-xs text-slate-500">{b.category}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        b.status === 'Full'
                          ? 'bg-red-100 text-red-700'
                          : b.status === 'Half Full'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-eco-100 text-eco-700'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${meta.barBg}`}
                      style={{ width: `${b.fill_percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2 text-slate-600 dark:text-slate-300">
                    <span>{b.current_items} / {b.capacity_items} items</span>
                    <span className="font-bold">{b.fill_percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  window.EcoSort.AIDetectionPage = AIDetectionPage;
})();

