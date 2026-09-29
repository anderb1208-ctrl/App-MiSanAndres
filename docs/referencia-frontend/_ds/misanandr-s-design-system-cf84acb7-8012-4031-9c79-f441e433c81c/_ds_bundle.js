/* @ds-bundle: {"format":4,"namespace":"MiSanAndrSDesignSystem_cf84ac","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"GlassPanel","sourcePath":"components/core/GlassPanel.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"DestinoCard","sourcePath":"components/destinos/DestinoCard.jsx"},{"name":"OCC_LEVELS","sourcePath":"components/destinos/IndicadorOcupacion.jsx"},{"name":"IndicadorOcupacion","sourcePath":"components/destinos/IndicadorOcupacion.jsx"},{"name":"MapMarker","sourcePath":"components/destinos/MapMarker.jsx"},{"name":"UserLocation","sourcePath":"components/destinos/MapMarker.jsx"},{"name":"OcupacionChart","sourcePath":"components/destinos/OcupacionChart.jsx"},{"name":"FilterChip","sourcePath":"components/forms/FilterChip.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"SelectRow","sourcePath":"components/forms/SelectRow.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"BottomNav","sourcePath":"components/navigation/BottomNav.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/core/Button.jsx":"a04ceb769a9d","components/core/GlassPanel.jsx":"df2698390023","components/core/Icon.jsx":"9f7076e1d897","components/core/IconButton.jsx":"24b28606029a","components/core/Tag.jsx":"9762c9c50000","components/destinos/DestinoCard.jsx":"52df7f85f15b","components/destinos/IndicadorOcupacion.jsx":"ea48335a7f69","components/destinos/MapMarker.jsx":"ed087fb8f0c8","components/destinos/OcupacionChart.jsx":"7b2cd0eecabf","components/forms/FilterChip.jsx":"2cc9240f26b5","components/forms/SearchField.jsx":"51a967768058","components/forms/SelectRow.jsx":"553341af30fd","components/forms/TextField.jsx":"baef9b452e0d","components/navigation/BottomNav.jsx":"3a0b596d2589","components/navigation/TopBar.jsx":"12481fa9b411","ui_kits/app/App.js":"5b687384fee8","ui_kits/app/AuthScreens.js":"1e8fa1a304a8","ui_kits/app/DetailScreens.js":"7df481dc3447","ui_kits/app/MainScreens.js":"5731dcabde66","ui_kits/app/Shell.js":"a90124fec7a5","ui_kits/app/data.js":"9dc871d20656"},"inlinedExternals":[],"unexposedExports":[{"name":"levelFor","sourcePath":"components/destinos/IndicadorOcupacion.jsx"}]} */

(() => {

const __ds_ns = (window.MiSanAndrSDesignSystem_cf84ac = window.MiSanAndrSDesignSystem_cf84ac || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/GlassPanel.jsx
try { (() => {
const TONES = {
  light: {
    background: 'var(--glass-light)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    color: 'var(--text-body)'
  },
  strong: {
    background: 'var(--glass-light-strong)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    color: 'var(--text-body)'
  },
  dark: {
    background: 'var(--glass-dark)',
    border: '1px solid var(--glass-border-dark)',
    boxShadow: 'var(--glass-shadow-dark)',
    color: '#fff'
  }
};
function GlassPanel({
  children,
  tone = 'light',
  radius = 'var(--radius-xl)',
  padding = 16,
  style,
  onClick
}) {
  const t = TONES[tone] || TONES.light;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      ...t,
      borderRadius: radius,
      padding,
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      position: 'relative',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { GlassPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/GlassPanel.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Icon({
  name,
  size = 24,
  fill = false,
  weight = 400,
  color,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true"
  }, rest, {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontSize: size,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      overflow: 'hidden',
      letterSpacing: 'normal',
      textTransform: 'none',
      whiteSpace: 'nowrap',
      direction: 'ltr',
      WebkitFontSmoothing: 'antialiased',
      userSelect: 'none',
      flexShrink: 0,
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
      color,
      ...style
    }
  }), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const VARIANTS = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: '1px solid var(--color-primary)',
    boxShadow: '0 6px 16px rgba(0,20,48,.18)'
  },
  secondary: {
    background: 'var(--color-secondary)',
    color: 'var(--color-on-secondary)',
    border: '1px solid var(--color-secondary)',
    boxShadow: '0 6px 16px rgba(0,103,125,.2)'
  },
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--color-primary)',
    border: '1px solid var(--border-default)',
    boxShadow: 'none'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid transparent',
    boxShadow: 'none'
  },
  glass: {
    background: 'var(--glass-light)',
    color: 'var(--color-primary)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)'
  },
  'glass-dark': {
    background: 'var(--glass-dark)',
    color: '#fff',
    border: '1px solid var(--glass-border-dark)',
    boxShadow: 'var(--glass-shadow-dark)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)'
  },
  danger: {
    background: 'var(--surface-card)',
    color: 'var(--color-error)',
    border: '1px solid var(--red-100)',
    boxShadow: 'none'
  }
};
const SIZES = {
  sm: {
    height: 36,
    padding: '0 14px',
    fontSize: 13,
    gap: 6,
    radius: 'var(--radius-md)',
    icon: 18
  },
  md: {
    height: 48,
    padding: '0 20px',
    fontSize: 15,
    gap: 8,
    radius: 'var(--radius-lg)',
    icon: 20
  },
  lg: {
    height: 54,
    padding: '0 24px',
    fontSize: 16,
    gap: 8,
    radius: 'var(--radius-lg)',
    icon: 20
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      ...v,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      borderRadius: s.radius,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 600,
      letterSpacing: '0.005em',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: pressed && !disabled ? 'scale(var(--press-scale))' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-base), box-shadow var(--dur-base)',
      boxShadow: pressed && !disabled && (variant === 'primary' || variant === 'secondary') ? 'var(--shadow-press)' : v.boxShadow,
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const TONES = {
  'glass-dark': {
    background: 'var(--glass-light-faint)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,.35)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)'
  },
  glass: {
    background: 'var(--glass-light)',
    color: 'var(--color-primary)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    boxShadow: 'var(--glass-shadow)'
  },
  plain: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '1px solid transparent'
  },
  tonal: {
    background: 'var(--color-secondary-soft)',
    color: 'var(--color-secondary)',
    border: '1px solid transparent'
  }
};
function IconButton({
  icon,
  tone = 'plain',
  size = 40,
  active = false,
  label,
  onClick,
  style
}) {
  const t = TONES[tone] || TONES.plain;
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    onClick: onClick,
    style: {
      ...t,
      width: size,
      height: size,
      borderRadius: 'var(--radius-full)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'transform var(--dur-fast) var(--ease-out)',
      ...style
    },
    onPointerDown: e => e.currentTarget.style.transform = 'scale(.92)',
    onPointerUp: e => e.currentTarget.style.transform = 'none',
    onPointerLeave: e => e.currentTarget.style.transform = 'none'
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.55),
    fill: active,
    color: active && tone !== 'glass-dark' ? 'var(--color-secondary)' : undefined
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  children,
  icon,
  tone = 'neutral',
  style
}) {
  const tones = {
    neutral: {
      background: 'var(--surface-low)',
      color: 'var(--text-muted)',
      border: '1px solid rgba(225,227,228,.6)'
    },
    sand: {
      background: 'var(--surface-sand)',
      color: 'var(--sand-700)',
      border: '1px solid var(--sand-200)'
    },
    turquoise: {
      background: 'rgba(179,235,255,.45)',
      color: 'var(--turq-700)',
      border: '1px solid rgba(80,217,254,.35)'
    },
    glass: {
      background: 'var(--glass-light)',
      color: 'var(--text-strong)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur-sm)',
      WebkitBackdropFilter: 'var(--glass-blur-sm)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...(tones[tone] || tones.neutral),
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 'var(--radius-full)',
      font: 'var(--type-label-md)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontSize: 16,
      lineHeight: 1
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/destinos/IndicadorOcupacion.jsx
try { (() => {
const OCC_LEVELS = {
  low: {
    label: 'Baja',
    solid: 'var(--occ-low)',
    dot: 'var(--occ-low-dot)',
    bg: 'var(--occ-low-bg)',
    fg: 'var(--occ-low-fg)',
    border: 'var(--occ-low-border)',
    hint: 'Ideal para visitar ahora'
  },
  mid: {
    label: 'Media',
    solid: 'var(--occ-mid)',
    dot: 'var(--occ-mid-dot)',
    bg: 'var(--occ-mid-bg)',
    fg: 'var(--occ-mid-fg)',
    border: 'var(--occ-mid-border)',
    hint: 'Afluencia moderada'
  },
  high: {
    label: 'Alta',
    solid: 'var(--occ-high)',
    dot: 'var(--occ-high-dot)',
    bg: 'var(--occ-high-bg)',
    fg: 'var(--occ-high-fg)',
    border: 'var(--occ-high-border)',
    hint: 'Concurrido en este momento'
  }
};
function levelFor(value) {
  return value == null ? 'low' : value < 40 ? 'low' : value < 70 ? 'mid' : 'high';
}
function Badge({
  L,
  value,
  showValue,
  size,
  glass
}) {
  const small = size === 'sm';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: glass ? 'rgba(255,255,255,.78)' : L.bg,
      color: L.fg,
      border: `1px solid ${glass ? 'rgba(255,255,255,.7)' : L.border}`,
      backdropFilter: glass ? 'var(--glass-blur-sm)' : undefined,
      WebkitBackdropFilter: glass ? 'var(--glass-blur-sm)' : undefined,
      font: 'var(--type-label-bold)',
      fontSize: small ? 11 : 12,
      whiteSpace: 'nowrap',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 3,
      background: L.dot
    }
  }), L.label, showValue && value != null ? ` · ${value}%` : '');
}
function Bar({
  L,
  value,
  capacity
}) {
  const segs = 10,
    filled = Math.round((value || 0) / 10);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, value, "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, "de ocupaci\xF3n")), /*#__PURE__*/React.createElement(Badge, {
    L: L,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${segs},1fr)`,
      gap: 3
    }
  }, Array.from({
    length: segs
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      height: 8,
      borderRadius: 4,
      background: i < filled ? L.solid : 'rgba(196,198,208,.45)',
      transition: 'background var(--dur-base)'
    }
  }))), capacity && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, capacity));
}
function Gauge({
  L,
  value,
  capacity,
  size = 120
}) {
  const r = (size - 14) / 2,
    c = 2 * Math.PI * r,
    off = c * (1 - (value || 0) / 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: L.bg,
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: L.solid,
    strokeWidth: "12",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: off,
    style: {
      transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: L.fg
    }
  }, value, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-headline-sm)',
      fontWeight: 700,
      color: L.fg
    }
  }, L.label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, L.hint), capacity && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)',
      marginTop: 4
    }
  }, capacity)));
}
function IndicadorOcupacion({
  value,
  level,
  variant = 'badge',
  showValue = false,
  size = 'md',
  glass = false,
  capacity
}) {
  const L = OCC_LEVELS[level || levelFor(value)];
  if (variant === 'bar') return /*#__PURE__*/React.createElement(Bar, {
    L: L,
    value: value,
    capacity: capacity
  });
  if (variant === 'gauge') return /*#__PURE__*/React.createElement(Gauge, {
    L: L,
    value: value,
    capacity: capacity
  });
  return /*#__PURE__*/React.createElement(Badge, {
    L: L,
    value: value,
    showValue: showValue,
    size: size,
    glass: glass
  });
}
Object.assign(__ds_scope, { OCC_LEVELS, levelFor, IndicadorOcupacion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/destinos/IndicadorOcupacion.jsx", error: String((e && e.message) || e) }); }

// components/destinos/DestinoCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const cardBase = {
  background: 'var(--glass-light-strong)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
  borderRadius: 'var(--radius-xl)',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)'
};
function press(e, on) {
  e.currentTarget.style.transform = on ? 'scale(.985)' : 'none';
}
function DestinoCard({
  name,
  category,
  location,
  image,
  occupancy,
  note,
  layout = 'horizontal',
  favorite,
  onFavorite,
  onClick,
  style
}) {
  const meta = [category, location].filter(Boolean).join(' • ');
  const handlers = {
    onClick,
    onPointerDown: e => press(e, true),
    onPointerUp: e => press(e, false),
    onPointerLeave: e => press(e, false)
  };
  if (layout === 'featured') {
    return /*#__PURE__*/React.createElement("article", _extends({}, handlers, {
      style: {
        ...cardBase,
        position: 'relative',
        height: 280,
        background: 'var(--navy-800)',
        ...style
      }
    }), /*#__PURE__*/React.createElement("img", {
      src: image,
      alt: name,
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,20,48,.55) 0%, rgba(0,20,48,0) 55%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, occupancy != null && /*#__PURE__*/React.createElement(__ds_scope.IndicadorOcupacion, {
      value: occupancy,
      showValue: true,
      glass: true
    }), onFavorite && /*#__PURE__*/React.createElement("button", {
      "aria-label": "Favorito",
      onClick: e => {
        e.stopPropagation();
        onFavorite();
      },
      style: {
        width: 36,
        height: 36,
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,.35)',
        background: 'rgba(255,255,255,.2)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "favorite",
      size: 20,
      fill: favorite
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 10,
        padding: '12px 14px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--glass-dark)',
        border: '1px solid var(--glass-border-dark)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2)',
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-headline-sm)',
        fontWeight: 700
      }
    }, name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-label-md)',
        color: 'rgba(255,255,255,.85)',
        marginTop: 2
      }
    }, meta), note && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--type-label-md)',
        color: 'var(--turq-100)',
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "auto_awesome",
      size: 16
    }), note)));
  }
  if (layout === 'list') {
    return /*#__PURE__*/React.createElement("article", _extends({}, handlers, {
      style: {
        ...cardBase,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: 12,
        ...style
      }
    }), /*#__PURE__*/React.createElement("img", {
      src: image,
      alt: name,
      style: {
        width: 88,
        height: 88,
        borderRadius: 'var(--radius-md)',
        objectFit: 'cover',
        flexShrink: 0,
        background: 'var(--surface-container)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        font: 'var(--type-headline-sm)',
        fontSize: 18,
        color: 'var(--text-strong)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, name), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        font: 'var(--type-label-md)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, meta), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-label-md)',
        color: 'var(--text-subtle)'
      }
    }, note), occupancy != null && /*#__PURE__*/React.createElement(__ds_scope.IndicadorOcupacion, {
      value: occupancy,
      showValue: true,
      size: "sm"
    }))));
  }
  if (layout === 'map') {
    return /*#__PURE__*/React.createElement("article", _extends({}, handlers, {
      style: {
        ...cardBase,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: 8,
        borderRadius: 'var(--radius-2xl)',
        ...style
      }
    }), /*#__PURE__*/React.createElement("img", {
      src: image,
      alt: name,
      style: {
        width: 92,
        height: 92,
        borderRadius: 'var(--radius-xl)',
        objectFit: 'cover',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        paddingRight: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        font: 'var(--type-headline-sm)',
        fontSize: 18,
        color: 'var(--text-body)'
      }
    }, name), onFavorite && /*#__PURE__*/React.createElement("button", {
      "aria-label": "Guardar",
      onClick: e => {
        e.stopPropagation();
        onFavorite();
      },
      style: {
        border: 0,
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        color: favorite ? 'var(--occ-high)' : 'var(--text-subtle)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "favorite",
      size: 20,
      fill: favorite
    }))), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        font: 'var(--type-label-md)',
        color: 'var(--text-muted)'
      }
    }, meta), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-label-md)',
        color: 'var(--text-muted)'
      }
    }, "Ocupaci\xF3n"), occupancy != null && /*#__PURE__*/React.createElement(__ds_scope.IndicadorOcupacion, {
      value: occupancy,
      showValue: true,
      size: "sm"
    }))));
  }

  // horizontal (Home "Recomendados para ti")
  return /*#__PURE__*/React.createElement("article", _extends({}, handlers, {
    style: {
      ...cardBase,
      display: 'flex',
      height: 128,
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '36%',
      flexShrink: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      font: 'var(--type-headline-sm)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), occupancy != null && /*#__PURE__*/React.createElement(__ds_scope.IndicadorOcupacion, {
    value: occupancy,
    size: "sm"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-label-md)',
      color: 'var(--text-accent)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, meta)), note && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, note)));
}
Object.assign(__ds_scope, { DestinoCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/destinos/DestinoCard.jsx", error: String((e && e.message) || e) }); }

// components/destinos/MapMarker.jsx
try { (() => {
function MapMarker({
  active = false,
  occupancy,
  label,
  onClick,
  style
}) {
  const ring = occupancy != null ? __ds_scope.OCC_LEVELS[__ds_scope.levelFor(occupancy)].solid : '#fff';
  const size = active ? 34 : 26;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": label,
    style: {
      position: 'absolute',
      transform: 'translate(-50%,-100%)',
      border: 0,
      background: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      zIndex: active ? 10 : 1,
      ...style
    }
  }, active && label && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--glass-light-strong)',
      backdropFilter: 'var(--glass-blur-sm)',
      WebkitBackdropFilter: 'var(--glass-blur-sm)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-2)',
      font: 'var(--type-label-bold)',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: '50% 50% 50% 0',
      transform: 'rotate(-45deg)',
      background: active ? 'var(--color-secondary)' : 'var(--color-primary)',
      boxShadow: 'var(--shadow-marker)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size * 0.36,
      height: size * 0.36,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: `0 0 0 2px ${ring}`
    }
  })));
}
function UserLocation({
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
      background: 'var(--color-secondary)',
      border: '2px solid #fff',
      boxShadow: '0 0 0 6px rgba(0,103,125,.25)',
      transform: 'translate(-50%,-50%)',
      ...style
    }
  });
}
Object.assign(__ds_scope, { MapMarker, UserLocation });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/destinos/MapMarker.jsx", error: String((e && e.message) || e) }); }

// components/destinos/OcupacionChart.jsx
try { (() => {
function OcupacionChart({
  data = [],
  height = 140,
  highlight
}) {
  const max = 100;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length},1fr)`,
      alignItems: 'end',
      gap: 6,
      height
    }
  }, data.map((d, i) => {
    const L = __ds_scope.OCC_LEVELS[__ds_scope.levelFor(d.value)];
    const hl = highlight === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      title: `${d.value}%`,
      style: {
        width: '100%',
        maxWidth: 18,
        height: `${d.value / max * 100}%`,
        borderRadius: 6,
        background: L.solid,
        opacity: highlight == null || hl ? 1 : 0.45,
        boxShadow: hl ? `0 0 0 3px ${L.bg}` : 'none',
        transition: 'height var(--dur-slow) var(--ease-out)'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length},1fr)`,
      gap: 6
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      textAlign: 'center',
      font: 'var(--type-label-md)',
      fontSize: 10,
      color: highlight === i ? 'var(--text-strong)' : 'var(--text-subtle)',
      fontWeight: highlight === i ? 700 : 500
    }
  }, d.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      justifyContent: 'center'
    }
  }, ['low', 'mid', 'high'].map(k => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-label-md)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 4,
      background: __ds_scope.OCC_LEVELS[k].solid
    }
  }), __ds_scope.OCC_LEVELS[k].label))));
}
Object.assign(__ds_scope, { OcupacionChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/destinos/OcupacionChart.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterChip.jsx
try { (() => {
function FilterChip({
  children,
  active = false,
  icon,
  accent = 'navy',
  glass = false,
  onClick,
  style
}) {
  const on = accent === 'turquoise' ? {
    background: 'var(--color-secondary)',
    color: '#fff',
    border: '1px solid var(--color-secondary)'
  } : {
    background: 'var(--color-primary)',
    color: '#fff',
    border: '1px solid var(--color-primary)'
  };
  const off = glass ? {
    background: 'var(--glass-light-strong)',
    color: 'var(--text-muted)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'var(--glass-blur-sm)',
    WebkitBackdropFilter: 'var(--glass-blur-sm)'
  } : {
    background: 'var(--surface-card)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-default)'
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...(active ? on : off),
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 36,
      padding: icon ? '0 16px 0 12px' : '0 16px',
      borderRadius: 'var(--radius-full)',
      font: 'var(--type-label-md)',
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      boxShadow: active ? '0 4px 12px rgba(0,20,48,.15)' : '0 1px 2px rgba(0,20,48,.05)',
      transition: 'background var(--dur-fast), color var(--dur-fast), transform var(--dur-fast)',
      ...style
    },
    onPointerDown: e => e.currentTarget.style.transform = 'scale(.95)',
    onPointerUp: e => e.currentTarget.style.transform = 'none',
    onPointerLeave: e => e.currentTarget.style.transform = 'none'
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    fill: active
  }), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function SearchField({
  placeholder = 'Buscar destinos',
  value,
  onChange,
  trailingIcon = 'tune',
  onTrailing,
  glass = true,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: 48,
      borderRadius: 'var(--radius-full)',
      background: glass ? 'var(--glass-light-strong)' : 'var(--surface-card)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: `1px solid ${focus ? 'var(--border-focus)' : glass ? 'var(--glass-border)' : 'rgba(196,198,208,.5)'}`,
      boxShadow: focus ? 'var(--focus-ring)' : glass ? 'var(--glass-shadow)' : '0 1px 2px rgba(0,20,48,.05)',
      transition: 'box-shadow var(--dur-fast), border-color var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 20,
    color: "var(--text-subtle)",
    style: {
      position: 'absolute',
      left: 16
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      height: '100%',
      border: 0,
      outline: 'none',
      background: 'transparent',
      padding: '0 48px 0 46px',
      font: 'var(--type-body-md)',
      fontSize: 15,
      color: 'var(--text-body)'
    }
  }), trailingIcon && /*#__PURE__*/React.createElement("button", {
    "aria-label": "Filtros",
    onClick: onTrailing,
    style: {
      position: 'absolute',
      right: 6,
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-full)',
      border: 0,
      cursor: 'pointer',
      background: 'var(--color-primary)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: trailingIcon,
    size: 18
  })));
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/SelectRow.jsx
try { (() => {
const ICON_TONES = {
  turquoise: {
    background: 'rgba(179,235,255,.4)',
    color: 'var(--color-secondary)'
  },
  neutral: {
    background: 'var(--surface-variant)',
    color: 'var(--text-muted)'
  },
  low: {
    background: 'var(--occ-low-tint)',
    color: 'var(--occ-low)'
  },
  mid: {
    background: 'var(--occ-mid-tint)',
    color: 'var(--occ-mid)'
  },
  high: {
    background: 'var(--occ-high-tint)',
    color: 'var(--occ-high)'
  },
  navy: {
    background: 'var(--navy-100)',
    color: 'var(--navy-800)'
  }
};
function Control({
  kind,
  checked
}) {
  if (kind === 'chevron') return /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron_right",
    size: 22,
    color: "var(--text-subtle)"
  });
  if (kind === 'switch') return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 26,
      borderRadius: 13,
      background: checked ? 'var(--color-secondary)' : 'var(--neutral-400)',
      position: 'relative',
      transition: 'background var(--dur-base)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: 10,
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.25)',
      transition: 'left var(--dur-base) var(--ease-out)'
    }
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 11,
      border: `2px solid ${checked ? 'var(--color-secondary)' : 'var(--neutral-400)'}`,
      background: checked && kind === 'checkbox' ? 'var(--color-secondary)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all var(--dur-fast)'
    }
  }, checked && kind === 'checkbox' && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16,
    weight: 500,
    color: "#fff"
  }), checked && kind === 'radio' && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 5,
      background: 'var(--color-secondary)'
    }
  }));
}
function SelectRow({
  label,
  description,
  icon,
  iconTone = 'turquoise',
  control = 'checkbox',
  checked = false,
  divider = true,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: control === 'chevron' ? 'button' : control,
    "aria-checked": control !== 'chevron' ? checked : undefined,
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      padding: 'var(--space-md)',
      minHeight: 64,
      cursor: 'pointer',
      borderBottom: divider ? '1px solid rgba(196,198,208,.25)' : 'none',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      ...(ICON_TONES[iconTone] || ICON_TONES.turquoise),
      width: 40,
      height: 40,
      borderRadius: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-lg)',
      fontWeight: description ? 600 : 400,
      fontSize: description ? 15 : 16,
      color: 'var(--text-body)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, description)), /*#__PURE__*/React.createElement(Control, {
    kind: control,
    checked: checked
  }));
}
Object.assign(__ds_scope, { SelectRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SelectRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function TextField({
  label,
  placeholder,
  type = 'text',
  value,
  defaultValue,
  onChange,
  icon,
  error,
  hint,
  glass = false,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const isPwd = type === 'password';
  const border = error ? 'var(--color-error)' : focus ? 'var(--border-focus)' : glass ? 'var(--glass-border)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)',
      width: '100%',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      fontWeight: 600,
      color: 'var(--text-muted)',
      paddingLeft: 4
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: "var(--text-subtle)",
    style: {
      position: 'absolute',
      left: 14,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: isPwd && show ? 'text' : type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: 48,
      padding: `0 ${isPwd ? 48 : 16}px 0 ${icon ? 44 : 16}px`,
      background: glass ? 'var(--glass-light)' : 'var(--surface-card)',
      backdropFilter: glass ? 'var(--glass-blur-sm)' : undefined,
      WebkitBackdropFilter: glass ? 'var(--glass-blur-sm)' : undefined,
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      boxShadow: focus ? `var(--focus-ring)` : '0 1px 2px rgba(0,20,48,.05)',
      font: 'var(--type-body-md)',
      fontSize: 15,
      color: 'var(--text-body)',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }), isPwd && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Mostrar contrase\xF1a",
    onClick: () => setShow(s => !s),
    style: {
      position: 'absolute',
      right: 6,
      width: 36,
      height: 36,
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: focus ? 'var(--color-secondary)' : 'var(--text-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: show ? 'visibility_off' : 'visibility',
    size: 20
  }))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: error ? 'var(--color-error)' : 'var(--text-subtle)',
      paddingLeft: 4
    }
  }, error || hint));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomNav.jsx
try { (() => {
const DEFAULT_ITEMS = [{
  id: 'inicio',
  label: 'Inicio',
  icon: 'home'
}, {
  id: 'explorar',
  label: 'Explorar',
  icon: 'search'
}, {
  id: 'recomendaciones',
  label: 'Para ti',
  icon: 'auto_awesome'
}, {
  id: 'mapa',
  label: 'Mapa',
  icon: 'map'
}, {
  id: 'perfil',
  label: 'Perfil',
  icon: 'person'
}];
function BottomNav({
  items = DEFAULT_ITEMS,
  active = 'inicio',
  onChange,
  floating = true,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'absolute',
      left: floating ? 12 : 0,
      right: floating ? 12 : 0,
      bottom: floating ? 16 : 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      gap: 4,
      padding: floating ? 6 : '8px 12px 22px',
      borderRadius: floating ? 'var(--radius-full)' : '12px 12px 0 0',
      background: 'rgba(255,255,255,.58)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,.6)',
      boxShadow: '0 10px 30px rgba(0,20,48,.14), inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(255,255,255,.2)',
      ...style
    }
  }, items.map(it => {
    const on = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onChange && onChange(it.id),
      "aria-current": on ? 'page' : undefined,
      style: {
        flex: 1,
        minWidth: 0,
        height: 56,
        border: 0,
        cursor: 'pointer',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: on ? 'rgba(80,217,254,.28)' : 'transparent',
        color: on ? 'var(--color-secondary)' : 'var(--text-muted)',
        boxShadow: on ? 'inset 0 1px 0 rgba(255,255,255,.7), 0 2px 8px rgba(0,103,125,.12)' : 'none',
        transition: 'background var(--dur-base) var(--ease-out), color var(--dur-base)',
        fontFamily: 'var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 24,
      fill: on
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        lineHeight: '14px',
        fontWeight: on ? 700 : 500
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  title,
  subtitle,
  onBack,
  actions = [],
  tone = 'glass',
  large = false,
  style
}) {
  const dark = tone === 'dark';
  const bg = tone === 'glass' ? {
    background: 'rgba(248,249,250,.72)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid rgba(255,255,255,.6)',
    boxShadow: '0 1px 0 rgba(196,198,208,.35)'
  } : tone === 'dark' ? {
    background: 'var(--glass-dark-strong)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--glass-border-dark)'
  } : {
    background: 'transparent'
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      ...bg,
      position: 'relative',
      zIndex: 40,
      padding: '12px var(--space-margin)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 44
    }
  }, onBack && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "arrow_back",
    tone: dark ? 'glass-dark' : 'plain',
    label: "Volver",
    onClick: onBack,
    style: {
      marginLeft: -8
    }
  }), !large && /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      flex: 1,
      font: 'var(--type-headline-sm)',
      color: dark ? '#fff' : 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), large && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), actions.map((a, i) => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: i,
    icon: a.icon,
    label: a.label,
    active: a.active,
    onClick: a.onClick,
    tone: dark ? 'glass-dark' : 'plain',
    style: i === actions.length - 1 ? {
      marginRight: -8
    } : undefined
  }))), large && /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: dark ? '#fff' : 'var(--text-strong)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body-md)',
      color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-muted)'
    }
  }, subtitle));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.js
try { (() => {
const {
  BottomNav: ABottomNav
} = window.MiSanAndrSDesignSystem_cf84ac;
const TABS = ['inicio', 'explorar', 'recomendaciones', 'mapa', 'perfil'];
function App() {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem('msa-kit-route')) || null;
    } catch (e) {
      return null;
    }
  })();
  const [stack, setStack] = React.useState(saved || [{
    s: 'splash'
  }]);
  const [favs, setFavs] = React.useState(['johnny']);
  const [mapSel, setMapSel] = React.useState('johnny');
  React.useEffect(() => {
    localStorage.setItem('msa-kit-route', JSON.stringify(stack));
  }, [stack]);
  const cur = stack[stack.length - 1];
  const isTab = TABS.includes(cur.s);
  const go = (s, id) => setStack(st => TABS.includes(s) ? [{
    s
  }] : [...st, {
    s,
    id
  }]);
  const back = () => setStack(st => st.length > 1 ? st.slice(0, -1) : st);
  const open = id => go('detalle', id);
  const toggleFav = id => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const openMap = id => {
    setMapSel(id);
    setStack([{
      s: 'mapa'
    }]);
  };
  let view;
  switch (cur.s) {
    case 'splash':
      view = /*#__PURE__*/React.createElement(SplashScreen, {
        onStart: () => setStack([{
          s: 'login'
        }])
      });
      break;
    case 'login':
      view = /*#__PURE__*/React.createElement(LoginScreen, {
        onLogin: () => setStack([{
          s: 'inicio'
        }]),
        onRegister: () => go('registro')
      });
      break;
    case 'registro':
      view = /*#__PURE__*/React.createElement(RegisterScreen, {
        onBack: back,
        onDone: () => setStack([{
          s: 'preferencias',
          first: true
        }])
      });
      break;
    case 'inicio':
      view = /*#__PURE__*/React.createElement(HomeScreen, {
        go: go,
        open: open,
        favs: favs,
        toggleFav: toggleFav
      });
      break;
    case 'explorar':
      view = /*#__PURE__*/React.createElement(ExplorarScreen, {
        open: open
      });
      break;
    case 'recomendaciones':
      view = /*#__PURE__*/React.createElement(RecomendacionesScreen, {
        open: open,
        go: go
      });
      break;
    case 'mapa':
      view = /*#__PURE__*/React.createElement(MapaScreen, {
        open: open,
        selected: mapSel,
        setSelected: setMapSel,
        favs: favs,
        toggleFav: toggleFav
      });
      break;
    case 'perfil':
      view = /*#__PURE__*/React.createElement(PerfilScreen, {
        go: go,
        favs: favs,
        onLogout: () => setStack([{
          s: 'login'
        }])
      });
      break;
    case 'preferencias':
      view = /*#__PURE__*/React.createElement(PreferenciasScreen, {
        onBack: () => stack.length > 1 ? back() : setStack([{
          s: 'inicio'
        }])
      });
      break;
    case 'detalle':
      view = /*#__PURE__*/React.createElement(DetalleScreen, {
        key: cur.id,
        id: cur.id,
        onBack: back,
        go: go,
        favs: favs,
        toggleFav: toggleFav,
        openMap: openMap
      });
      break;
    default:
      view = null;
  }
  const dark = ['splash', 'inicio', 'detalle', 'login', 'registro'].includes(cur.s);
  return /*#__PURE__*/React.createElement(Phone, {
    darkStatus: dark
  }, view, isTab && /*#__PURE__*/React.createElement(ABottomNav, {
    active: cur.s,
    onChange: s => setStack([{
      s
    }])
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.js", error: String((e && e.message) || e) }); }

// ui_kits/app/AuthScreens.js
try { (() => {
const {
  Button: AButton,
  TextField: ATextField,
  IconButton: AIconButton,
  Icon: AIcon
} = window.MiSanAndrSDesignSystem_cf84ac;
function SplashScreen({
  onStart
}) {
  const D = window.MSA_DATA;
  return /*#__PURE__*/React.createElement(Screen, {
    bg: "#001430"
  }, /*#__PURE__*/React.createElement("img", {
    src: D.images + 'johnny-cay-hero.jpg',
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to bottom, rgba(0,20,48,.35) 0%, rgba(0,20,48,0) 35%, rgba(0,20,48,.2) 55%, rgba(0,20,48,.85) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 56,
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: '700 44px/48px var(--font-sans)',
      letterSpacing: '-0.03em',
      color: '#fff'
    }
  }, "MiSanAndr\xE9s"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      font: 'var(--type-body-lg)',
      fontSize: 18,
      lineHeight: '26px',
      color: 'rgba(255,255,255,.9)',
      maxWidth: 280
    }
  }, "Descubre San Andr\xE9s Isla de forma inteligente")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderRadius: 28,
      background: 'rgba(255,255,255,.14)',
      border: '1px solid rgba(255,255,255,.3)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      color: '#fff',
      font: 'var(--type-body-md)'
    }
  }, /*#__PURE__*/React.createElement(AIcon, {
    name: "groups",
    size: 20,
    color: "var(--turq-100)"
  }), /*#__PURE__*/React.createElement("span", null, "Recomendaciones seg\xFAn tus gustos y la ocupaci\xF3n de cada lugar en tiempo real.")), /*#__PURE__*/React.createElement(AButton, {
    size: "lg",
    fullWidth: true,
    onClick: onStart,
    iconRight: "arrow_forward",
    style: {
      background: '#fff',
      color: 'var(--color-primary)',
      borderColor: '#fff'
    }
  }, "Comenzar"))));
}
function AuthSheet({
  image,
  children,
  onBack
}) {
  return /*#__PURE__*/React.createElement(Screen, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '46%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 120,
      background: 'var(--scrim-top)'
    }
  }), onBack && /*#__PURE__*/React.createElement(AIconButton, {
    icon: "arrow_back",
    tone: "glass-dark",
    label: "Volver",
    onClick: onBack,
    style: {
      position: 'absolute',
      top: 56,
      left: 20,
      zIndex: 5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: '34%',
      borderRadius: '32px 32px 0 0',
      background: 'rgba(255,255,255,.86)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderTop: '1px solid rgba(255,255,255,.9)',
      boxShadow: '0 -8px 24px rgba(0,20,48,.08), inset 0 1px 0 #fff',
      overflowY: 'auto',
      scrollbarWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px 40px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%'
    }
  }, children)));
}
function LoginScreen({
  onLogin,
  onRegister
}) {
  return /*#__PURE__*/React.createElement(AuthSheet, {
    image: window.MSA_DATA.images + 'login-beach.jpg'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: 'var(--text-strong)'
    }
  }, "MiSanAndr\xE9s"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, "Inicia sesi\xF3n para continuar")), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onLogin();
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(ATextField, {
    label: "Correo electr\xF3nico",
    type: "email",
    placeholder: "ejemplo@correo.com",
    defaultValue: "ana.martinez@gmail.com"
  }), /*#__PURE__*/React.createElement(ATextField, {
    label: "Contrase\xF1a",
    type: "password",
    placeholder: "Ingresa tu contrase\xF1a",
    defaultValue: "caribe2026"
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      font: 'var(--type-label-md)',
      fontWeight: 600,
      paddingLeft: 4,
      marginBottom: 12
    }
  }, "\xBFOlvidaste tu contrase\xF1a?"), /*#__PURE__*/React.createElement(AButton, {
    type: "submit",
    size: "lg",
    fullWidth: true
  }, "Iniciar sesi\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 28,
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
      font: 'var(--type-body-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "\xBFNo tienes cuenta?"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onRegister();
    }
  }, "Reg\xEDstrate")));
}
function RegisterScreen({
  onBack,
  onDone
}) {
  const [a, setA] = React.useState('');
  const [b, setB] = React.useState('');
  const [terms, setTerms] = React.useState(true);
  const mismatch = b && a !== b;
  return /*#__PURE__*/React.createElement(AuthSheet, {
    image: window.MSA_DATA.images + 'west-view.jpg',
    onBack: onBack
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "Crear cuenta"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 20px',
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, "Completa tus datos para comenzar"), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (!mismatch) onDone();
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ATextField, {
    label: "Nombre completo",
    placeholder: "Ingresa tu nombre"
  }), /*#__PURE__*/React.createElement(ATextField, {
    label: "Correo electr\xF3nico",
    type: "email",
    placeholder: "ejemplo@correo.com"
  }), /*#__PURE__*/React.createElement(ATextField, {
    label: "Contrase\xF1a",
    type: "password",
    placeholder: "Crea una contrase\xF1a",
    value: a,
    onChange: setA,
    hint: "M\xEDnimo 8 caracteres"
  }), /*#__PURE__*/React.createElement(ATextField, {
    label: "Confirmar contrase\xF1a",
    type: "password",
    placeholder: "Confirma tu contrase\xF1a",
    value: b,
    onChange: setB,
    error: mismatch ? 'Las contraseñas no coinciden' : undefined
  }), /*#__PURE__*/React.createElement("label", {
    onClick: () => setTerms(!terms),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      font: 'var(--type-label-md)',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      margin: '2px 0 8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 6,
      border: `2px solid ${terms ? 'var(--color-secondary)' : 'var(--neutral-400)'}`,
      background: terms ? 'var(--color-secondary)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, terms && /*#__PURE__*/React.createElement(AIcon, {
    name: "check",
    size: 16,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", null, "Acepto los ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "T\xE9rminos y Condiciones"))), /*#__PURE__*/React.createElement(AButton, {
    type: "submit",
    size: "lg",
    fullWidth: true,
    disabled: !terms
  }, "Registrarme")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 24,
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
      font: 'var(--type-body-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "\xBFYa tienes cuenta?"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onBack();
    }
  }, "Inicia sesi\xF3n")));
}
Object.assign(window, {
  SplashScreen,
  LoginScreen,
  RegisterScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AuthScreens.js", error: String((e && e.message) || e) }); }

// ui_kits/app/DetailScreens.js
try { (() => {
const {
  DestinoCard: DCard,
  IndicadorOcupacion: DOcc,
  OcupacionChart: DChart,
  GlassPanel: DGlass,
  IconButton: DIconBtn,
  Icon: DIcon,
  Button: DButton,
  Tag: DTag,
  FilterChip: DChip,
  TopBar: DTop,
  MapMarker: DMarker,
  UserLocation: DUser,
  SelectRow: DRow
} = window.MiSanAndrSDesignSystem_cf84ac;
function DetalleScreen({
  id,
  onBack,
  go,
  favs,
  toggleFav,
  openMap
}) {
  const D = window.MSA_DATA;
  const d = D.destinos.find(x => x.id === id);
  const fav = favs.includes(d.id);
  const related = D.destinos.filter(x => x.id !== d.id && x.cats.some(c => d.cats.includes(c))).slice(0, 2);
  return /*#__PURE__*/React.createElement(Screen, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingBottom: 170
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 360
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: d.hero,
    alt: d.name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '0 0 auto 0',
      height: 130,
      background: 'var(--scrim-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      bottom: 52
    }
  }, /*#__PURE__*/React.createElement(DTag, {
    tone: "glass",
    icon: "photo_library"
  }, "1 / 8"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: -32,
      borderRadius: '28px 28px 0 0',
      background: '#fff',
      padding: '24px 20px 0',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(DTag, {
    tone: "turquoise"
  }, d.category)), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-display)',
      letterSpacing: 'var(--ls-display-lg)',
      color: 'var(--text-strong)'
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 16px',
      marginTop: 8,
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(DIcon, {
    name: "location_on",
    size: 18,
    color: "var(--color-secondary)"
  }), d.location), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(DIcon, {
    name: "schedule",
    size: 18,
    color: "var(--color-secondary)"
  }), d.hours)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      padding: 16,
      borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(179,235,255,.35), rgba(230,227,208,.35))',
      border: '1px solid var(--border-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label-bold)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 10
    }
  }, "Ocupaci\xF3n actual"), /*#__PURE__*/React.createElement(DOcc, {
    value: d.occupancy,
    variant: "bar",
    capacity: d.capacity
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '24px 0 8px',
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, "Descripci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body-md)',
      lineHeight: '22px',
      color: 'var(--text-muted)'
    }
  }, d.desc), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '24px 0 10px',
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, "Caracter\xEDsticas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, d.features.map(([ic, l]) => /*#__PURE__*/React.createElement(DTag, {
    key: l,
    icon: ic
  }, l))), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '24px 0 4px',
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, "Ocupaci\xF3n durante el d\xEDa"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px',
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, "Hoy \xB7 la barra resaltada es la hora actual"), /*#__PURE__*/React.createElement(DChart, {
    height: 110,
    highlight: 3,
    data: d.history.map((v, i) => ({
      label: D.hours[i],
      value: v
    }))
  }), related.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '28px 0 12px',
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, "Recomendaciones relacionadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, related.map(r => /*#__PURE__*/React.createElement(DCard, {
    key: r.id,
    layout: "list",
    name: r.name,
    category: r.category,
    image: r.image,
    occupancy: r.occupancy,
    note: r.distance,
    onClick: () => go('detalle', r.id)
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 56,
      left: 20,
      right: 20,
      display: 'flex',
      justifyContent: 'space-between',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(DIconBtn, {
    icon: "arrow_back",
    tone: "glass-dark",
    label: "Volver",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(DIconBtn, {
    icon: "share",
    tone: "glass-dark",
    label: "Compartir"
  }), /*#__PURE__*/React.createElement(DIconBtn, {
    icon: "favorite",
    tone: "glass-dark",
    active: fav,
    label: "Favorito",
    onClick: () => toggleFav(d.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 22,
      zIndex: 20,
      padding: 10,
      borderRadius: 28,
      display: 'flex',
      gap: 8,
      background: 'rgba(255,255,255,.62)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,.7)',
      boxShadow: '0 10px 30px rgba(0,20,48,.16), inset 0 1px 0 #fff'
    }
  }, /*#__PURE__*/React.createElement(DButton, {
    size: "lg",
    icon: "map",
    onClick: () => openMap(d.id),
    style: {
      flex: 1,
      borderRadius: 20
    }
  }, "Ver ubicaci\xF3n"), /*#__PURE__*/React.createElement(DButton, {
    size: "lg",
    variant: "glass",
    icon: "auto_awesome",
    onClick: () => go('recomendaciones'),
    style: {
      flex: 1,
      borderRadius: 20
    }
  }, "Similares")));
}
function MapaScreen({
  open,
  selected,
  setSelected,
  favs,
  toggleFav
}) {
  const D = window.MSA_DATA;
  const [cat, setCat] = React.useState('Todos');
  const list = D.destinos.filter(d => cat === 'Todos' || d.cats.includes(cat));
  const sel = D.destinos.find(d => d.id === selected) || list[0];
  return /*#__PURE__*/React.createElement(Screen, {
    bg: "#8fd9ec"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `url(${D.images}map-island.png) center/cover`
    }
  }, list.map(d => /*#__PURE__*/React.createElement(DMarker, {
    key: d.id,
    style: d.pin,
    active: sel && sel.id === d.id,
    label: d.name,
    occupancy: d.occupancy,
    onClick: () => setSelected(d.id)
  })), /*#__PURE__*/React.createElement(DUser, {
    style: {
      top: '50%',
      left: '52%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(DTop, {
    title: "Mapa de destinos",
    actions: [{
      icon: 'my_location',
      label: 'Mi ubicación'
    }, {
      icon: 'tune',
      label: 'Filtros'
    }],
    style: {
      paddingTop: 52
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      padding: '12px 20px',
      scrollbarWidth: 'none'
    }
  }, ['Todos', 'Playas', 'Naturaleza', 'Aventura', 'Cultura'].map(c => /*#__PURE__*/React.createElement(DChip, {
    key: c,
    glass: true,
    accent: "turquoise",
    active: cat === c,
    onClick: () => setCat(c)
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: 236,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(DGlass, {
    tone: "strong",
    padding: 10,
    radius: 14,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, [['low', 'Baja'], ['mid', 'Media'], ['high', 'Alta']].map(([k, l]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-label-md)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 4,
      background: `var(--occ-${k})`
    }
  }), l)))), sel && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 104,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement(DCard, {
    layout: "map",
    name: sel.name,
    category: sel.category,
    location: sel.location.split(' · ')[0],
    image: sel.image,
    occupancy: sel.occupancy,
    favorite: favs.includes(sel.id),
    onFavorite: () => toggleFav(sel.id),
    onClick: () => open(sel.id)
  })));
}
function PerfilScreen({
  go,
  onLogout,
  favs
}) {
  const D = window.MSA_DATA;
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement(DTop, {
    large: true,
    tone: "transparent",
    title: "Mi perfil",
    style: {
      paddingTop: 52
    },
    actions: [{
      icon: 'settings',
      label: 'Ajustes'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(DGlass, {
    tone: "strong",
    padding: 16,
    radius: 20,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: D.user.avatar,
    alt: "",
    style: {
      width: 64,
      height: 64,
      borderRadius: 32,
      objectFit: 'cover',
      border: '2px solid #fff',
      boxShadow: 'var(--shadow-2)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, D.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, D.user.email)), /*#__PURE__*/React.createElement(DIconBtn, {
    icon: "edit",
    tone: "tonal",
    label: "Editar perfil"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10
    }
  }, [[favs.length, 'Favoritos'], [3, 'Intereses'], ['Baja', 'Ocupación pref.']].map(([n, l]) => /*#__PURE__*/React.createElement(DGlass, {
    key: l,
    padding: 12,
    radius: 16,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-headline-sm)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, l)))), /*#__PURE__*/React.createElement(DGlass, {
    tone: "strong",
    padding: 0,
    radius: 20,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(DRow, {
    icon: "tune",
    label: "Mis preferencias",
    description: "Ver y editar preferencias",
    control: "chevron",
    onClick: () => go('preferencias')
  }), /*#__PURE__*/React.createElement(DRow, {
    icon: "notifications_active",
    label: "Alertas de ocupaci\xF3n",
    description: "Avisarme cuando baje la ocupaci\xF3n",
    control: "switch",
    checked: true
  }), /*#__PURE__*/React.createElement(DRow, {
    icon: "favorite",
    label: "Favoritos",
    description: "Lugares guardados",
    control: "chevron"
  }), /*#__PURE__*/React.createElement(DRow, {
    icon: "info",
    iconTone: "neutral",
    label: "Acerca de la app",
    description: "Informaci\xF3n y ayuda",
    control: "chevron",
    divider: false
  })), /*#__PURE__*/React.createElement(DButton, {
    variant: "danger",
    size: "lg",
    fullWidth: true,
    icon: "logout",
    onClick: onLogout
  }, "Cerrar sesi\xF3n"))));
}
function PreferenciasScreen({
  onBack
}) {
  const D = window.MSA_DATA;
  const [sel, setSel] = React.useState(['Playas', 'Naturaleza', 'Aventura']);
  const [occ, setOcc] = React.useState('low');
  const [saved, setSaved] = React.useState(false);
  const toggle = c => {
    setSaved(false);
    setSel(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);
  };
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingBottom: 120
    }
  }, /*#__PURE__*/React.createElement(DTop, {
    title: "Editar preferencias",
    onBack: onBack,
    tone: "transparent",
    style: {
      paddingTop: 52
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 8px',
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, "Cu\xE9ntanos qu\xE9 te gusta para mejorar tus recomendaciones."), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-label-bold)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-body)'
    }
  }, "Categor\xEDas de inter\xE9s"), /*#__PURE__*/React.createElement(DGlass, {
    tone: "strong",
    padding: 0,
    radius: 16,
    style: {
      overflow: 'hidden'
    }
  }, D.categorias.map(([c, ic], i) => /*#__PURE__*/React.createElement(DRow, {
    key: c,
    icon: ic,
    iconTone: sel.includes(c) ? 'turquoise' : 'neutral',
    label: c,
    checked: sel.includes(c),
    onClick: () => toggle(c),
    divider: i < D.categorias.length - 1,
    style: {
      minHeight: 58,
      padding: '9px 16px'
    }
  }))), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '12px 0 0',
      font: 'var(--type-label-bold)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-body)'
    }
  }, "Nivel de ocupaci\xF3n preferido"), /*#__PURE__*/React.createElement(DGlass, {
    tone: "strong",
    padding: 0,
    radius: 16,
    style: {
      overflow: 'hidden'
    }
  }, [['low', 'Baja', 'signal_cellular_alt_1_bar', 'Lugares tranquilos'], ['mid', 'Media', 'signal_cellular_alt_2_bar', 'Algo de ambiente'], ['high', 'Alta', 'signal_cellular_alt', 'No me importa si hay gente']].map(([k, l, ic, desc], i) => /*#__PURE__*/React.createElement(DRow, {
    key: k,
    icon: ic,
    iconTone: k,
    label: l,
    description: desc,
    control: "radio",
    checked: occ === k,
    onClick: () => {
      setOcc(k);
      setSaved(false);
    },
    divider: i < 2
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 22,
      zIndex: 20,
      padding: 10,
      borderRadius: 28,
      background: 'rgba(255,255,255,.62)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,.7)',
      boxShadow: '0 10px 30px rgba(0,20,48,.16), inset 0 1px 0 #fff'
    }
  }, /*#__PURE__*/React.createElement(DButton, {
    size: "lg",
    fullWidth: true,
    icon: saved ? 'check' : undefined,
    variant: saved ? 'secondary' : 'primary',
    onClick: () => setSaved(true),
    style: {
      borderRadius: 20
    }
  }, saved ? 'Cambios guardados' : 'Guardar cambios')));
}
Object.assign(window, {
  DetalleScreen,
  MapaScreen,
  PerfilScreen,
  PreferenciasScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DetailScreens.js", error: String((e && e.message) || e) }); }

// ui_kits/app/MainScreens.js
try { (() => {
const {
  DestinoCard: HCard,
  IndicadorOcupacion: HOcc,
  GlassPanel: HGlass,
  IconButton: HIconBtn,
  Icon: HIcon,
  SearchField: HSearch,
  FilterChip: HChip,
  TopBar: HTop
} = window.MiSanAndrSDesignSystem_cf84ac;
const hLevel = v => v < 40 ? 'low' : v < 70 ? 'mid' : 'high';
function HomeScreen({
  go,
  open,
  favs,
  toggleFav
}) {
  const D = window.MSA_DATA;
  const sorted = [...D.destinos].sort((a, b) => b.match - a.match);
  const low = D.destinos.filter(d => hLevel(d.occupancy) === 'low').length;
  const mid = D.destinos.filter(d => hLevel(d.occupancy) === 'mid').length;
  const high = D.destinos.length - low - mid;
  const quick = [['explorar', 'search', 'Explorar'], ['mapa', 'map', 'Mapa'], ['recomendaciones', 'auto_awesome', 'Para ti']];
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 320,
      borderRadius: '0 0 28px 28px',
      overflow: 'hidden',
      background: 'var(--navy-950)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: D.images + 'hero-aerial.jpg',
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-bottom)',
      opacity: 0.9
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 58,
      left: 20,
      right: 20,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '-0.01em'
    }
  }, "MiSanAndr\xE9s"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(HIconBtn, {
    icon: "notifications",
    tone: "glass-dark",
    label: "Notificaciones"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => go('perfil'),
    style: {
      width: 40,
      height: 40,
      borderRadius: 20,
      padding: 0,
      border: '2px solid rgba(255,255,255,.7)',
      overflow: 'hidden',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: D.user.avatar,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 64
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-headline-md)',
      color: '#fff'
    }
  }, "Hola, ", D.user.first), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      font: 'var(--type-body-md)',
      color: 'rgba(255,255,255,.85)'
    }
  }, "Estas son tus recomendaciones personalizadas"))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '-44px 20px 0',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(HGlass, {
    tone: "strong",
    padding: 16,
    radius: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-bold)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, "Ocupaci\xF3n ahora"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "schedule",
    size: 14
  }), "Actualizado 10:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 8
    }
  }, [['low', low, 'Baja'], ['mid', mid, 'Media'], ['high', high, 'Alta']].map(([k, n, l]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      padding: '10px 12px',
      borderRadius: 12,
      background: `var(--occ-${k}-bg)`,
      border: `1px solid var(--occ-${k}-border)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: `var(--occ-${k}-fg)`
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label-md)',
      color: `var(--occ-${k}-fg)`
    }
  }, "Ocupaci\xF3n ", l.toLowerCase())))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10,
      padding: '16px 20px 0'
    }
  }, quick.map(([id, ic, l]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => go(id),
    style: {
      height: 76,
      borderRadius: 18,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      background: 'var(--glass-light)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: 'var(--glass-shadow)',
      color: 'var(--text-strong)',
      font: 'var(--type-label-bold)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 17,
      background: 'rgba(80,217,254,.25)',
      color: 'var(--color-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: ic,
    size: 20
  })), l))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px 0'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Destacados para ti",
    action: "Ver todo",
    onAction: () => go('recomendaciones')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      padding: '0 20px 4px',
      scrollbarWidth: 'none',
      scrollSnapType: 'x mandatory'
    }
  }, sorted.slice(0, 3).map(d => /*#__PURE__*/React.createElement(HCard, {
    key: d.id,
    layout: "featured",
    name: d.name,
    category: d.category,
    location: d.location.split(' · ')[0],
    image: d.image,
    occupancy: d.occupancy,
    note: `${d.match}% compatible contigo`,
    favorite: favs.includes(d.id),
    onFavorite: () => toggleFav(d.id),
    onClick: () => open(d.id),
    style: {
      flex: '0 0 272px',
      height: 300,
      scrollSnapAlign: 'start'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px 0'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Recomendados para ti",
    sub: "Lugares con condiciones ideales ahora mismo."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [...D.destinos].sort((a, b) => a.occupancy - b.occupancy).slice(0, 3).map(d => /*#__PURE__*/React.createElement(HCard, {
    key: d.id,
    layout: "horizontal",
    name: d.name,
    category: d.category,
    image: d.image,
    occupancy: d.occupancy,
    note: d.note,
    onClick: () => open(d.id)
  }))))));
}
function ExplorarScreen({
  open
}) {
  const D = window.MSA_DATA;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('Todos');
  const [onlyLow, setOnlyLow] = React.useState(false);
  const list = D.destinos.filter(d => (cat === 'Todos' || d.cats.includes(cat)) && (!q || d.name.toLowerCase().includes(q.toLowerCase())) && (!onlyLow || hLevel(d.occupancy) === 'low'));
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingTop: 236,
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-muted)'
    }
  }, list.length, " destinos", cat !== 'Todos' ? ` en ${cat}` : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "swap_vert",
    size: 16
  }), "Menor ocupaci\xF3n")), list.sort((a, b) => a.occupancy - b.occupancy).map(d => /*#__PURE__*/React.createElement(HCard, {
    key: d.id,
    layout: "list",
    name: d.name,
    category: d.category,
    location: d.location.split(' · ')[0],
    image: d.image,
    occupancy: d.occupancy,
    note: d.distance,
    onClick: () => open(d.id)
  })), list.length === 0 && /*#__PURE__*/React.createElement(HGlass, {
    tone: "strong",
    padding: 24,
    radius: 20,
    style: {
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "travel_explore",
    size: 36,
    color: "var(--color-secondary)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, "Sin resultados"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, "Prueba con otra categor\xEDa o quita los filtros.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      padding: '56px 20px 12px',
      background: 'rgba(243,246,248,.7)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid rgba(255,255,255,.7)',
      boxShadow: '0 4px 20px rgba(0,20,48,.05)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 12px',
      font: 'var(--type-headline-md)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "Explorar destinos"), /*#__PURE__*/React.createElement(HSearch, {
    value: q,
    onChange: setQ,
    onTrailing: () => setOnlyLow(!onlyLow)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      margin: '12px -20px 0',
      padding: '0 20px 2px',
      scrollbarWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(HChip, {
    active: cat === 'Todos',
    onClick: () => setCat('Todos')
  }, "Todos"), D.categorias.map(([c, ic]) => /*#__PURE__*/React.createElement(HChip, {
    key: c,
    icon: ic,
    active: cat === c,
    onClick: () => setCat(c)
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(HChip, {
    accent: "turquoise",
    active: onlyLow,
    onClick: () => setOnlyLow(!onlyLow),
    style: {
      height: 30,
      fontSize: 12
    }
  }, "Solo ocupaci\xF3n baja"))));
}
function RecomendacionesScreen({
  open,
  go
}) {
  const D = window.MSA_DATA;
  const [mode, setMode] = React.useState('match');
  const modes = [['match', 'Para ti'], ['calm', 'Tranquilos'], ['near', 'Cerca de ti']];
  const list = [...D.destinos].sort((a, b) => mode === 'match' ? b.match - a.match : mode === 'calm' ? a.occupancy - b.occupancy : a.distance.localeCompare(b.distance));
  const top = list[0];
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(Scroll, {
    style: {
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement(HTop, {
    large: true,
    tone: "transparent",
    title: "Recomendaciones",
    subtitle: "Seg\xFAn tus preferencias y la ocupaci\xF3n actual",
    style: {
      paddingTop: 52
    },
    actions: [{
      icon: 'tune',
      label: 'Preferencias',
      onClick: () => go('preferencias')
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      margin: '4px 20px 16px',
      padding: 4,
      borderRadius: 999,
      background: 'var(--glass-light)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: 'var(--glass-shadow)'
    }
  }, modes.map(([id, l]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setMode(id),
    style: {
      flex: 1,
      height: 36,
      border: 0,
      borderRadius: 999,
      cursor: 'pointer',
      font: 'var(--type-label-bold)',
      fontSize: 12,
      background: mode === id ? 'var(--color-primary)' : 'transparent',
      color: mode === id ? '#fff' : 'var(--text-muted)',
      transition: 'background var(--dur-base)'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px'
    }
  }, /*#__PURE__*/React.createElement(HCard, {
    layout: "featured",
    name: top.name,
    category: top.category,
    location: top.location.split(' · ')[0],
    image: top.image,
    occupancy: top.occupancy,
    note: `Coincide con: ${top.reasons.join(' · ')}`,
    onClick: () => open(top.id),
    style: {
      height: 260
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Tambi\xE9n te pueden gustar"
  }), list.slice(1).map(d => /*#__PURE__*/React.createElement(HGlass, {
    key: d.id,
    tone: "strong",
    padding: 12,
    radius: 16,
    onClick: () => open(d.id),
    style: {
      cursor: 'pointer',
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: d.image,
    alt: "",
    style: {
      width: 72,
      height: 72,
      borderRadius: 12,
      objectFit: 'cover',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-headline-sm)',
      fontSize: 17,
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, d.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-bold)',
      color: 'var(--color-secondary)',
      whiteSpace: 'nowrap'
    }
  }, d.match, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, d.reasons.map(r => /*#__PURE__*/React.createElement("span", {
    key: r,
    style: {
      padding: '2px 8px',
      borderRadius: 999,
      background: 'rgba(179,235,255,.45)',
      color: 'var(--turq-700)',
      font: 'var(--type-label-md)',
      fontSize: 11
    }
  }, r))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label-md)',
      color: 'var(--text-subtle)'
    }
  }, d.distance), /*#__PURE__*/React.createElement(HOcc, {
    value: d.occupancy,
    showValue: true,
    size: "sm"
  }))))))));
}
Object.assign(window, {
  HomeScreen,
  ExplorarScreen,
  RecomendacionesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/MainScreens.js", error: String((e && e.message) || e) }); }

// ui_kits/app/Shell.js
try { (() => {
const {
  Icon: PIcon
} = window.MiSanAndrSDesignSystem_cf84ac;
function StatusBar({
  dark
}) {
  const c = dark ? '#fff' : 'var(--text-strong)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 50,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 30px 0',
      color: c,
      pointerEvents: 'none',
      transition: 'color var(--dur-base)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 16px/1 var(--font-sans)'
    }
  }, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "signal_cellular_alt",
    size: 18,
    fill: true
  }), /*#__PURE__*/React.createElement(PIcon, {
    name: "wifi",
    size: 18,
    fill: true
  }), /*#__PURE__*/React.createElement(PIcon, {
    name: "battery_full",
    size: 20,
    fill: true,
    style: {
      transform: 'rotate(90deg)'
    }
  })));
}
function Phone({
  children,
  darkStatus
}) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 32) / 864, (window.innerWidth - 32) / 410));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 410 * scale,
      height: 864 * scale
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 410,
      height: 864,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      borderRadius: 58,
      background: '#0b0f14',
      padding: 10,
      boxShadow: '0 30px 80px rgba(0,20,48,.35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 390,
      height: 844,
      borderRadius: 48,
      overflow: 'hidden',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    dark: darkStatus
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 120,
      height: 34,
      borderRadius: 20,
      background: '#000',
      zIndex: 101
    }
  }), children, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 134,
      height: 5,
      borderRadius: 3,
      background: darkStatus ? 'rgba(255,255,255,.8)' : 'rgba(0,20,48,.85)',
      zIndex: 101
    }
  }))));
}

/* Tinted ambient backdrop so glass surfaces have something to refract */
const ambientBg = 'radial-gradient(90% 45% at 0% 0%, rgba(179,235,255,.75) 0%, rgba(179,235,255,0) 70%), radial-gradient(80% 40% at 100% 60%, rgba(230,227,208,.8) 0%, rgba(230,227,208,0) 70%), radial-gradient(70% 35% at 10% 100%, rgba(80,217,254,.25) 0%, rgba(80,217,254,0) 70%), #f3f6f8';
function Screen({
  children,
  bg = ambientBg,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: bg,
      overflow: 'hidden',
      ...style
    }
  }, children);
}
function Scroll({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflowY: 'auto',
      scrollbarWidth: 'none',
      ...style
    }
  }, children);
}
function SectionHead({
  title,
  action,
  onAction,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: sub ? 4 : 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: 'var(--type-headline-sm)',
      color: 'var(--text-strong)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 12px',
      font: 'var(--type-body-md)',
      color: 'var(--text-muted)'
    }
  }, sub)), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      border: 0,
      background: 'none',
      padding: 0,
      marginBottom: sub ? 12 : 0,
      font: 'var(--type-label-bold)',
      fontSize: 13,
      color: 'var(--text-link)',
      cursor: 'pointer'
    }
  }, action));
}
Object.assign(window, {
  Phone,
  Screen,
  Scroll,
  SectionHead,
  ambientBg
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Shell.js", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
window.MSA_DATA = (() => {
  const I = '../../assets/images/';
  const destinos = [{
    id: 'johnny',
    name: 'Johnny Cay',
    category: 'Playa',
    cats: ['Playas', 'Familia'],
    location: 'Parque Regional · Norte',
    image: I + 'johnny-cay.jpg',
    hero: I + 'johnny-cay-hero.jpg',
    occupancy: 25,
    capacity: 'Aforo estimado: 120 de 480 personas',
    distance: '1,8 km en lancha',
    hours: '8:00 – 16:00',
    match: 96,
    desc: 'Pequeño islote ubicado frente a San Andrés, con playas de arena blanca y mar cristalino. Ideal para relajarse y disfrutar del paisaje.',
    features: [['wc', 'Baños'], ['restaurant', 'Restaurantes'], ['scuba_diving', 'Snorkel'], ['directions_boat', 'Acceso en lancha']],
    history: [10, 18, 25, 40, 58, 64, 52, 35, 20],
    note: 'Ocupación ideal para relajarse',
    reasons: ['Playas', 'Ocupación baja'],
    pin: {
      top: '30%',
      left: '64%'
    }
  }, {
    id: 'acuario',
    name: 'Acuario San Andrés',
    category: 'Atractivo turístico',
    cats: ['Playas', 'Aventura', 'Familia'],
    location: 'Haynes Cay',
    image: I + 'acuario.jpg',
    hero: I + 'acuario.jpg',
    occupancy: 55,
    capacity: 'Aforo estimado: 260 de 470 personas',
    distance: '3,2 km en lancha',
    hours: '8:30 – 15:30',
    match: 88,
    desc: 'Banco de arena de aguas poco profundas entre dos cayos, donde se puede caminar en el mar y observar rayas y peces de colores.',
    features: [['scuba_diving', 'Snorkel'], ['kayaking', 'Kayak'], ['directions_boat', 'Tour en lancha']],
    history: [8, 22, 40, 55, 70, 74, 60, 42, 25],
    note: 'Buen momento para snorkel',
    reasons: ['Aventura', 'Familia'],
    pin: {
      top: '43%',
      left: '70%'
    }
  }, {
    id: 'piscinita',
    name: 'La Piscinita',
    category: 'Atractivo natural',
    cats: ['Naturaleza', 'Aventura'],
    location: 'West View · Carretera circunvalar',
    image: I + 'piscinita.jpg',
    hero: I + 'piscinita.jpg',
    occupancy: 78,
    capacity: 'Aforo estimado: 150 de 190 personas',
    distance: 'A 6,1 km',
    hours: '9:00 – 17:00',
    match: 74,
    desc: 'Piscina natural formada entre rocas de coral, con aguas profundas y transparentes. Muy popular para nadar, saltar y alimentar peces.',
    features: [['pool', 'Piscina natural'], ['scuba_diving', 'Snorkel'], ['restaurant', 'Kiosco']],
    history: [15, 30, 52, 70, 82, 86, 78, 60, 40],
    note: 'Concurrido en este momento',
    reasons: ['Naturaleza'],
    pin: {
      top: '57%',
      left: '46%'
    }
  }, {
    id: 'hoyo',
    name: 'Hoyo Soplador',
    category: 'Atractivo natural',
    cats: ['Naturaleza', 'Cultura'],
    location: 'San Luis · Sur',
    image: I + 'hoyo-soplador.jpg',
    hero: I + 'hoyo-soplador.jpg',
    occupancy: 34,
    capacity: 'Aforo estimado: 70 de 200 personas',
    distance: 'A 8,4 km',
    hours: '8:00 – 18:00',
    match: 81,
    desc: 'Formación rocosa en la costa sur por la que el mar expulsa chorros de agua a varios metros de altura, según la marea.',
    features: [['photo_camera', 'Mirador'], ['storefront', 'Artesanías'], ['local_parking', 'Parqueadero']],
    history: [5, 12, 20, 30, 34, 38, 30, 22, 12],
    note: 'Poca afluencia ahora',
    reasons: ['Naturaleza', 'Ocupación baja'],
    pin: {
      top: '72%',
      left: '43%'
    }
  }, {
    id: 'westview',
    name: 'West View',
    category: 'Mirador / Buceo',
    cats: ['Aventura', 'Gastronomía'],
    location: 'Costa occidental',
    image: I + 'west-view.jpg',
    hero: I + 'west-view.jpg',
    occupancy: 62,
    capacity: 'Aforo estimado: 190 de 300 personas',
    distance: 'A 5,7 km',
    hours: '9:00 – 17:30',
    match: 70,
    desc: 'Plataforma sobre el mar con trampolín y tobogán, ideal para buceo superficial. Cuenta con restaurante de comida típica isleña.',
    features: [['scuba_diving', 'Buceo'], ['restaurant', 'Comida típica'], ['wc', 'Baños']],
    history: [10, 25, 45, 60, 66, 70, 62, 45, 28],
    note: 'Afluencia moderada',
    reasons: ['Aventura', 'Gastronomía'],
    pin: {
      top: '49%',
      left: '36%'
    }
  }];
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16'];
  const categorias = [['Playas', 'beach_access'], ['Naturaleza', 'eco'], ['Gastronomía', 'restaurant'], ['Familia', 'family_restroom'], ['Cultura', 'museum'], ['Aventura', 'kayaking']];
  return {
    destinos,
    hours,
    categorias,
    user: {
      name: 'Ana Martínez',
      first: 'Ana',
      email: 'ana.martinez@gmail.com',
      avatar: I + 'avatar-ana.jpg'
    },
    images: I
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.GlassPanel = __ds_scope.GlassPanel;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.DestinoCard = __ds_scope.DestinoCard;

__ds_ns.OCC_LEVELS = __ds_scope.OCC_LEVELS;

__ds_ns.IndicadorOcupacion = __ds_scope.IndicadorOcupacion;

__ds_ns.MapMarker = __ds_scope.MapMarker;

__ds_ns.UserLocation = __ds_scope.UserLocation;

__ds_ns.OcupacionChart = __ds_scope.OcupacionChart;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.SelectRow = __ds_scope.SelectRow;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
