"use client";

import { motion, AnimatePresence } from "framer-motion";

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  allAmenities: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  accentColor?: "emerald" | "blue";
}

export default function FilterModal({
  open,
  onClose,
  allAmenities,
  selected,
  onChange,
  accentColor = "emerald",
}: FilterModalProps) {
  function toggle(amenity: string) {
    if (selected.includes(amenity)) {
      onChange(selected.filter((a) => a !== amenity));
    } else {
      onChange([...selected, amenity]);
    }
  }

  const activeRing = accentColor === "blue" ? "ring-blue-500 bg-blue-50 text-blue-700" : "ring-emerald-500 bg-emerald-50 text-emerald-700";
  const activeDot = accentColor === "blue" ? "bg-blue-600" : "bg-emerald-500";
  const applyBtn = accentColor === "blue" ? "bg-blue-600" : "bg-emerald-500";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Filter by Amenity</h2>
              {selected.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Amenity grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {allAmenities.map((amenity) => {
                  const isSelected = selected.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggle(amenity)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ring-1 ${
                        isSelected
                          ? `${activeRing} border-transparent`
                          : "ring-gray-200 border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {isSelected && <span className={`w-1.5 h-1.5 rounded-full ${activeDot}`} />}
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apply */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className={`w-full ${applyBtn} text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-base`}
              >
                {selected.length > 0
                  ? `Show results · ${selected.length} filter${selected.length > 1 ? "s" : ""}`
                  : "Apply"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
