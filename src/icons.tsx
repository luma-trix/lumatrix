import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  AddressBook, Archive as ArchiveIcon, ArrowBendUpRight, ArrowClockwise, ArrowLeft as ArrowLeftIcon,
  ArrowUUpLeft, ArrowsClockwise, Bell as BellIcon, BellSlash, Broadcast, CalendarBlank, Camera as CameraIcon,
  CaretLeft, CaretRight, ChartBar, ChatCircleDots, Check as CheckIcon, Checks, Clock, Copy as CopyIcon, Crop as CropIcon,
  DeviceMobile, DotsThreeVertical, DownloadSimple, EnvelopeSimple, Eye as EyeIcon, EyeSlash, FileText as FileTextIcon,
  Gear, Hash as HashIcon, Image as ImageIcon, Key, LockKey, MagnifyingGlass, MapPin as MapPinIcon,
  Microphone, Moon as MoonIcon, Palette as PaletteIcon, PaperPlaneTilt, Paperclip as PaperclipIcon,
  Pause as PauseIcon, PencilSimple, Phone as PhoneIcon, PhoneCall as PhoneCallIcon,
  PhoneIncoming as PhoneIncomingIcon, PhoneOutgoing as PhoneOutgoingIcon, PhoneX as PhoneXIcon,
  ClockCounterClockwise, BellRinging, Play as PlayIcon,
  Plus as PlusIcon, PlusCircle, PushPin, ShieldCheck as ShieldCheckIcon,
  SidebarSimple, SignOut, Smiley, Sparkle, SpinnerGap, Star as StarIcon, Sticker as StickerIcon,
  Sun as SunIcon, Trash as TrashIcon, UploadSimple, UserCircle, UserPlus as UserPlusIcon, UsersThree,
  VideoCamera, SpeakerHigh, X as XIcon
} from '@phosphor-icons/react'

const modern = (Icon: ComponentType<IconProps>, defaultWeight: IconProps['weight']='duotone') =>
  function ModernIcon(props: IconProps) { return <Icon {...props} weight={props.weight ?? defaultWeight}/> }

export const Check=modern(CheckIcon,'bold'), Search=modern(MagnifyingGlass), MoreVertical=modern(DotsThreeVertical,'bold'), Video=modern(VideoCamera), Phone=modern(PhoneIcon), Smile=modern(Smiley), Send=modern(PaperPlaneTilt,'fill'), Mic=modern(Microphone), Plus=modern(PlusIcon,'bold'), MessageCircle=modern(ChatCircleDots), Users=modern(UsersThree), Radio=modern(Broadcast), PhoneCall=modern(PhoneCallIcon), Archive=modern(ArchiveIcon), CheckCheck=modern(Checks,'bold'), Image=modern(ImageIcon), FileText=modern(FileTextIcon), MapPin=modern(MapPinIcon), Contact=modern(AddressBook), X=modern(XIcon,'bold'), ChevronLeft=modern(CaretLeft,'bold'), ChevronRight=modern(CaretRight,'bold'), Moon=modern(MoonIcon), Sun=modern(SunIcon), Palette=modern(PaletteIcon), BellOff=modern(BellSlash), Bell=modern(BellIcon), Pin=modern(PushPin), ShieldCheck=modern(ShieldCheckIcon), Camera=modern(CameraIcon), Play=modern(PlayIcon,'fill'), Download=modern(DownloadSimple), Hash=modern(HashIcon,'bold'), LockKeyhole=modern(LockKey), Sparkles=modern(Sparkle,'fill'), Volume2=modern(SpeakerHigh), PanelLeftClose=modern(SidebarSimple), CirclePlus=modern(PlusCircle)
export const ArrowLeft=modern(ArrowLeftIcon,'bold'), Eye=modern(EyeIcon), EyeOff=modern(EyeSlash), KeyRound=modern(Key), LoaderCircle=modern(SpinnerGap), Mail=modern(EnvelopeSimple), UserRound=modern(UserCircle)
export const BarChart3=modern(ChartBar), Copy=modern(CopyIcon), FileUp=modern(UploadSimple), Forward=modern(ArrowBendUpRight), Pencil=modern(PencilSimple), Paperclip=modern(PaperclipIcon), Pause=modern(PauseIcon,'fill'), RefreshCw=modern(ArrowsClockwise), Reply=modern(ArrowUUpLeft), Settings=modern(Gear), Star=modern(StarIcon), Sticker=modern(StickerIcon), Trash2=modern(TrashIcon)
export const CalendarClock=modern(CalendarBlank), Clock3=modern(Clock), Crop=modern(CropIcon), Edit3=modern(PencilSimple), LogOut=modern(SignOut), Smartphone=modern(DeviceMobile), UserPlus=modern(UserPlusIcon), RotateCw=modern(ArrowClockwise)
export const PhoneIncoming=modern(PhoneIncomingIcon), PhoneOutgoing=modern(PhoneOutgoingIcon), PhoneMissed=modern(PhoneXIcon), CallHistory=modern(ClockCounterClockwise), BellAlert=modern(BellRinging)
