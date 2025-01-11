import { unified } from 'unified'
//import createStream from 'unified-stream'
import uniorgParse from 'uniorg-parse'
import uniorg2rehype from 'uniorg-rehype'
import uniorgSlug from 'uniorg-slug'
import extractKeywords from 'uniorg-extract-keywords'
import attachments from 'uniorg-attach'
// rehypeHighlight does not have any types
// add error thing here
// import highlight from 'rehype-highlight'
import rehypePrism from '@mapbox/rehype-prism'
import katex from 'rehype-katex'
import 'katex/dist/katex.css'
import rehype2react from 'rehype-react'

import remarkParse from 'remark-parse'
import remarkGFM from 'remark-gfm'
// remark wikilinks does not have any type declarations
//@ts-expect-error
import remarkWikiLinks from 'remark-wiki-link'
import remarkMath from 'remark-math'
import remarkFrontMatter from 'remark-frontmatter'
import remarkExtractFrontMatter from 'remark-extract-frontmatter'
// remark sectionize does not have any type declarations
//@ts-expect-error
import remarkSectionize from 'remark-sectionize'
import remarkRehype from 'remark-rehype'

import { PreviewLink } from '../components/Sidebar/Link'
import { LinksByNodeId, NodeByCite, NodeById } from '../pages'
import React, { createContext, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { OrgImage } from '../components/Sidebar/OrgImage'
import { Section } from '../components/Sidebar/Section'
import { NoteContext } from './NoteContext'
import { OrgRoamLink, OrgRoamNode } from '../api'

// @ts-expect-error non-ESM unified means no types
import { toString } from 'hast-util-to-string'
import { Box, chakra, Code, IconButton } from '@chakra-ui/react'
import { normalizeLinkEnds } from './normalizeLinkEnds'
import * as prod from 'react/jsx-runtime'
import Prism from 'prismjs'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'

export interface ProcessedOrgProps {
	nodeById: NodeById
	previewNode: OrgRoamNode
	setPreviewNode: any
	previewText: any
	nodeByCite: NodeByCite
	setSidebarHighlightedNode: any
	openContextMenu: any
	outline: boolean
	collapse: boolean
	linksByNodeId: LinksByNodeId
	macros: { [key: string]: string } | {}
	attachDir: string
	useInheritance: boolean
}

const convertToFoldAttr = (value: string | undefined): boolean | undefined => {
	if (value === 'false') {
		return false
	} else if (value === 'true') {
		return true
	}
	return undefined
}
export const ProcessedOrg = (props: ProcessedOrgProps) => {
	const {
		nodeById,
		setSidebarHighlightedNode,
		setPreviewNode,
		previewText,
		nodeByCite,
		previewNode,
		openContextMenu,
		outline,
		collapse,
		linksByNodeId,
		macros,
		attachDir,
		useInheritance,
	} = props

	const orgProcessor = unified()
		.use(uniorgParse)
		.use(extractKeywords)
		.use(attachments, {
			idDir: attachDir || undefined,
			useInheritance,
		})
		.use(uniorgSlug)
		.use(uniorg2rehype, { useSections: true })

	const nodesInNote =
		linksByNodeId[previewNode?.id!]?.reduce((acc: NodeById, link: OrgRoamLink) => {
			const links = normalizeLinkEnds(link)
			const relevantLink = links.filter((l) => l !== previewNode.id).join('')
			return {
				...acc,
				[relevantLink]: nodeById[relevantLink],
			}
		}, {}) || {}

	const linkEntries = Object.entries(nodesInNote)
	const wikiLinkResolver = (wikiLink: string): string[] => {
		const entry = linkEntries.find((idNodeArray) => {
			return idNodeArray?.[1]?.title === wikiLink
		})
		const id = entry?.[0] ?? ''
		return [id]
	}

	const wikiLinkProcessor = (wikiLink: string): string => {
		return `id:${wikiLink}`
	}

	const mdProcessor = unified()
		.use(remarkParse)
		.use(remarkFrontMatter, ['yaml'])
		.use(remarkExtractFrontMatter)
		.use(remarkWikiLinks, {
			permaLinks: Object.keys(nodesInNote),
			pageResolver: wikiLinkResolver,
			hrefTemplate: wikiLinkProcessor,
		})
		.use(remarkSectionize)
		.use(remarkMath)
		.use(remarkGFM)
		.use(remarkRehype)
	//.data('settings', { fragment: true })
	// .use(highlight)

	const isMarkdown = previewNode?.file?.slice(-3) === '.md'
	// const baseProcessor = isMarkdown ? mdProcessor : orgProcessor

	const processor = useMemo(
		() =>
			orgProcessor
				.use(katex, {
					trust: (context) => ['\\htmlId', '\\href'].includes(context.command),
					macros: {
						'\\eqref': '\\href{###1}{(\\text{#1})}',
						'\\ref': '\\href{###1}{\\text{#1}}',
						'\\label': '\\htmlId{#1}{}',
						// '\\weird': '\\textbf{#1}',
						...macros,
					},
				})
				// @ts-ignore
				.use(rehype2react, {
					Fragment: prod.Fragment,
					jsx: prod.jsx,
					jsxs: prod.jsxs,
					createElement: React.createElement,
					components: {
						a: ({ children, href }) => {
							return (
								<PreviewLink
									nodeByCite={nodeByCite}
									setSidebarHighlightedNode={setSidebarHighlightedNode}
									href={`${href as string}`}
									nodeById={nodeById}
									linksByNodeId={linksByNodeId}
									setPreviewNode={setPreviewNode}
									openContextMenu={openContextMenu}
									outline={outline}
									previewNode={previewNode}
									isWiki={isMarkdown}
									macros={macros}
									attachDir={attachDir}
									useInheritance={useInheritance}
								>
									{children}
								</PreviewLink>
							)
						},
						img: (org) => {
							return <OrgImage org={org} file={previewNode?.file} />
						},
						section: ({ children, className }) => {
							if (className && className?.slice(-1) === `${previewNode.level}`) {
								return <Box>{children}</Box>
							}

							return (
								<Section {...{ outline, collapse }} className={className ?? ''}>
									{children}
								</Section>
							)
						},
						blockquote: ({ children }) => (
							<chakra.blockquote
								color="gray.800"
								bgColor="gray.300"
								pt={4}
								pb={2}
								mb={4}
								mt={3}
								pl={4}
								borderLeftWidth={4}
								borderLeftColor="gray.700"
							>
								{children}
							</chakra.blockquote>
						),
						p: ({ children }) => {
							return <div lang="en">{children as ReactNode}</div>
						},
						code: ({ children, className, ...args }) => {
							const isInlineCode = className?.includes('inline-code')
							const elRef = useRef<any>(null)
							const [fold, setFold] = useState(convertToFoldAttr((args as any)['fold']))
							useEffect(() => {
								!isInlineCode && !fold && elRef.current && Prism.highlightElement(elRef.current)
							}, [elRef.current, fold])
							return fold ? (
								<div
									style={{ display: 'flex', alignItems: 'center' }}
									className="fold-toggle"
									onClick={() => setFold(!fold)}
								>
									<IconButton
										// className="viewerHeadingButton"
										_focus={{}}
										_active={{}}
										aria-label="Expand heading"
										//mr={1}
										size="lg"
										variant="subtle"
										icon={fold ? <ChevronDownIcon /> : <ChevronUpIcon />}
										height={2}
										width={2}
									></IconButton>
									<span>{fold ? 'Show code' : 'Hide code'}</span>
								</div>
							) : (
								<chakra.code
									className={`${className}`}
									ref={elRef}
									px={1}
									py={0.5}
									rounded="sm"
									fontSize="xs"
									color="gray.800"
									bgColor={isInlineCode ? 'gray.300' : 'none'}
								>
									{children}
								</chakra.code>
							)
						},
					},
				})
				.use(rehypePrism as any, { ignoreMissing: true }),
		[previewNode?.id],
	)

	const text = useMemo(() => processor.processSync(previewText).result, [previewText])
	if (!previewNode || !linksByNodeId) {
		return null
	}

	return (
		<NoteContext.Provider value={{ collapse, outline }}>{text as ReactNode}</NoteContext.Provider>
	)
}
