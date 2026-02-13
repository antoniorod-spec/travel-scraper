'use client';

import styles from '../styles';

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          color: 'var(--accent)',
          marginBottom: 12,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, value, fieldKey, onUpdate, multiline }) {
  if (onUpdate && fieldKey) {
    const displayValue = value ?? '';
    if (multiline) {
      return (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
            {label}
          </div>
          <textarea
            style={styles.editableTextarea}
            value={displayValue}
            onChange={(e) => onUpdate(fieldKey, e.target.value)}
          />
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
        <span style={{ width: 160, minWidth: 160, color: 'var(--text-muted)', fontWeight: 500 }}>
          {label}
        </span>
        <input
          type="text"
          style={styles.editableInput}
          value={displayValue}
          onChange={(e) => onUpdate(fieldKey, e.target.value)}
        />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ width: 160, minWidth: 160, color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {value || '-'}
      </span>
    </div>
  );
}

export default function DetailPanel({ data, onClose, onUpdate }) {
  const updateItineraryDay = (index, value) => {
    const days = [...(data.itineraryDays || [])];
    days[index] = value;
    onUpdate('itineraryDays', days);
  };

  const updateItineraryText = (index, value) => {
    const texts = [...(data.itineraryTexts || [])];
    texts[index] = value;
    onUpdate('itineraryTexts', texts);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.detailHeader}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <input
              type="text"
              style={{ ...styles.editableInput, fontSize: 18, fontWeight: 700, padding: '6px 10px' }}
              value={data.title || data.metaTitle || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
            />
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.detailBody}>
          <DetailSection title="Información General">
            <Field label="URL" fieldKey="url" value={data.url} onUpdate={onUpdate} />
            <Field label="Meta Title" fieldKey="metaTitle" value={data.metaTitle} onUpdate={onUpdate} />
            <Field label="Meta Description" fieldKey="metaDescription" value={data.metaDescription} onUpdate={onUpdate} multiline />
            <Field label="Título" fieldKey="title" value={data.title} onUpdate={onUpdate} />
            <Field label="Países" fieldKey="countries" value={data.countries} onUpdate={onUpdate} />
            <Field label="Días" fieldKey="days" value={data.days} onUpdate={onUpdate} />
            <Field label="Noches" fieldKey="nights" value={data.nights} onUpdate={onUpdate} />
            <Field label="Fechas" fieldKey="travelDates" value={data.travelDates} onUpdate={onUpdate} />
            <Field label="Fecha Texto" fieldKey="dateText" value={data.dateText} onUpdate={onUpdate} />
            <Field label="Ciudades" fieldKey="cities" value={data.cities} onUpdate={onUpdate} />
            <Field label="Orígenes" fieldKey="origins" value={data.origins} onUpdate={onUpdate} />
          </DetailSection>

          <DetailSection title="Categorización">
            <Field label="Categoría 1" fieldKey="category1" value={data.category1} onUpdate={onUpdate} />
            <Field label="Categoría 2" fieldKey="category2" value={data.category2} onUpdate={onUpdate} />
            <Field label="Categoría 3" fieldKey="category3" value={data.category3} onUpdate={onUpdate} />
            {(data.extraCategories || []).map((cat, i) => (
              <Field key={i} label={`Categoría ${i + 4}`} value={cat} />
            ))}
            <Field label="Tipo Circuito" fieldKey="circuitType" value={data.circuitType} onUpdate={onUpdate} />
            <Field label="Precio" fieldKey="price" value={data.price} onUpdate={onUpdate} />
          </DetailSection>

          <DetailSection title="Imágenes">
            <Field label="Banner" fieldKey="imageBanner" value={data.imageBanner} onUpdate={onUpdate} />
            <Field label="Img. Pequeña" fieldKey="imageSmall" value={data.imageSmall} onUpdate={onUpdate} />
            {data.imageSmall && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={data.imageSmall}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid var(--border)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </DetailSection>

          <DetailSection title="Contenido">
            <Field label="Descripción corta" fieldKey="shortDescription" value={data.shortDescription} onUpdate={onUpdate} multiline />
            <Field label="El viaje incluye" fieldKey="tripIncludes" value={data.tripIncludes} onUpdate={onUpdate} multiline />
            <Field label="Exc. incluidas" fieldKey="excursionsIncluded" value={data.excursionsIncluded} onUpdate={onUpdate} multiline />
            <Field label="Exc. opcionales" fieldKey="excursionsOptional" value={data.excursionsOptional} onUpdate={onUpdate} multiline />
            <Field label="Hoteles" fieldKey="hotels" value={data.hotels} onUpdate={onUpdate} multiline />
            <Field label="Pie de precios" fieldKey="priceFooter" value={data.priceFooter} onUpdate={onUpdate} multiline />
          </DetailSection>

          <DetailSection title="Itinerario — Días">
            {(data.itineraryDays || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.itineraryDays.map((day, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 55, minWidth: 55, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      Día {i + 1}
                    </span>
                    <input
                      type="text"
                      style={styles.editableInput}
                      value={day || ''}
                      onChange={(e) => updateItineraryDay(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de itinerario</span>
            )}
          </DetailSection>

          <DetailSection title="Itinerario — Texto">
            {(data.itineraryTexts || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.itineraryTexts.map((text, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 500 }}>
                      Día {i + 1}
                    </div>
                    <textarea
                      style={{ ...styles.editableTextarea, minHeight: 50 }}
                      value={text || ''}
                      onChange={(e) => updateItineraryText(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de itinerario</span>
            )}
          </DetailSection>

          <DetailSection title="Valores Fijos">
            <Field label="Config. Regional" fieldKey="regionalConfig" value={data.regionalConfig} onUpdate={onUpdate} />
            <Field label="Promociones" fieldKey="promotions" value={data.promotions} onUpdate={onUpdate} />
            <Field label="Proveedor" fieldKey="provider" value={data.provider} onUpdate={onUpdate} />
            <Field label="Cat. Orígenes" fieldKey="catalogOrigins" value={data.catalogOrigins} onUpdate={onUpdate} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
