"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { searchAddress, type AddressSuggestion } from "@/app/[locale]/(app)/projects/actions";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/shared/components/ui/combobox";

interface Props {
  name?: string;
  value: string;
  onValueChange: (address: string) => void;
  onLocationSelect: (lat: number, lng: number, label: string) => void;
}

const DEBOUNCE_MS = 350;

export function AddressCombobox({ name, value, onValueChange, onLocationSelect }: Props) {
  const t = useTranslations("projects");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputValueChange = useCallback(
    (text: string) => {
      onValueChange(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length < 3) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const requestId = ++requestIdRef.current;
      debounceRef.current = setTimeout(async () => {
        const results = await searchAddress(text);
        if (requestIdRef.current === requestId) {
          setSuggestions(results);
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [onValueChange],
  );

  const handleValueChange = useCallback(
    (item: AddressSuggestion | null) => {
      if (!item) return;
      onValueChange(item.label);
      onLocationSelect(item.lat, item.lng, item.label);
      setSuggestions([]);
    },
    [onValueChange, onLocationSelect],
  );

  return (
    <Combobox<AddressSuggestion>
      items={suggestions}
      filter={null}
      inputValue={value}
      onInputValueChange={handleInputValueChange}
      value={null}
      onValueChange={handleValueChange}
      itemToStringLabel={(s) => s?.label ?? ""}
      itemToStringValue={(s) => (s ? s.label : "")}
      name={name}
    >
      <ComboboxInputGroup className="h-8 min-h-0 py-0">
        <MapPin className="size-3.5 shrink-0 text-veltol-faint" />
        <ComboboxInput placeholder={t("addressSearchPlaceholder")} className="text-sm" />
      </ComboboxInputGroup>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>
              {loading ? t("addressSearchLoading") : t("addressSearchNoResults")}
            </ComboboxEmpty>
            <ComboboxList>
              {(s: AddressSuggestion) => (
                <ComboboxItem key={`${s.lat},${s.lng}`} value={s}>
                  {s.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  );
}
