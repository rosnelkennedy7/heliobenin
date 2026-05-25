export function defaultHours(nom, categorie) {
  const n = (nom || '').toLowerCase()
  const c = (categorie || '').toLowerCase()

  if (n.includes('réfrigér') || n.includes('congél'))
    return { hJour: 12, hNuit: 12 }

  if (c === 'eclairage')
    return { hJour: 2, hNuit: 6 }

  if (n.includes('ventil') || n.includes('climatiseur') || c === 'climatisation')
    return { hJour: 6, hNuit: 4 }

  if (c === 'audiovisuel' || n.includes('télév'))
    return { hJour: 3, hNuit: 2 }

  if (c === 'informatique' || n.includes('ordinat') || n.includes('laptop'))
    return { hJour: 8, hNuit: 0 }

  if (n.includes('chargeur') || n.includes('téléphone'))
    return { hJour: 2, hNuit: 2 }

  if (n.includes('fer ') || c === 'cuisine')
    return { hJour: 1, hNuit: 0 }

  return { hJour: 4, hNuit: 0 }
}
