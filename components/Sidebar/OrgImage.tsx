/* eslint-disable @next/next/no-img-element */
import React, { ElementRef, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import path from 'path'
import { Container } from '@chakra-ui/react'
import { createPortal } from 'react-dom'
//import '../../../public/placeholder.png'

const convertToNextImageAttr = (value: string | number | undefined): number | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value === 'number' || !isNaN(Number(value))) {
		return Number(value)
	}

	if (value.endsWith('px')) {
		return Number(value.replace('px', ''))
	}

	return undefined
}

export interface OrgImageProps {
	org: React.ClassAttributes<HTMLImageElement> & React.ImgHTMLAttributes<HTMLImageElement>
	file: string
}

export const OrgImage = (props: OrgImageProps) => {
	const { org, file } = props
	const { src, ...attr } = org
	const [open, setOpen] = useState(false)
	const dialogRef = useRef<ElementRef<'dialog'>>(null)
	useEffect(() => {
		if (open) {
			dialogRef.current?.showModal()
		} else {
			dialogRef.current?.close()
		}
	}, [open])

	if (!src) {
		return null
	}

	const dumbLoader = ({ src, width, quality }: { [key: string]: string | number }) => {
		return `${src}`
	}
	const homeLoader = ({ src, width, quality }: { [key: string]: string | number }) => {
		return `img/${src}`
	}

	const attrWidth = convertToNextImageAttr(attr.width)
	const attrHeight = convertToNextImageAttr(attr.height)
	const layout = attrWidth || attrHeight ? undefined : 'responsive'
	if (/http.*/g.test(src.replace(/(http)?.*/g, '$1'))) {
		return (
			<Image
				{...attr}
				layout={layout}
				loader={dumbLoader}
				src={src}
				width={attrWidth}
				height={attrHeight}
				alt={attr.alt ?? 'Wow, an image.'}
			/>
		)
	}

	const srcName = src.replace(/file:/g, '')

	const dir = path.dirname(file)
	const fullPath =
		path.isAbsolute(srcName) || srcName.slice(0, 1) === '~' ? srcName : path.join(dir, srcName)
	// const encodedPath = encodeURIComponent(encodeURIComponent(fullPath))

	return (
		<>
			{open &&
				createPortal(
					<div className="modal-backdrop" onClick={() => setOpen(false)}>
						<dialog ref={dialogRef} className="modal" onClose={() => setOpen(false)}>
							<img
								{...attr}
								alt={attr.alt ?? 'Wow, an image.'}
								src={fullPath}
								onClick={() => setOpen(true)}
							/>
						</dialog>
					</div>,
					document.getElementById('modal-root') as HTMLElement,
				)}
			<Container my={4} position="relative">
				<img
					{...attr}
					alt={attr.alt ?? 'Wow, an image.'}
					src={fullPath}
					onClick={() => setOpen(true)}
				/>
			</Container>
		</>
	)
}
