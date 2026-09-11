import {Component, type ReactNode} from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
}

/** Isolate preview render failures so the editor stays usable. */
export default class PreviewErrorBoundary extends Component<Props, State> {
    state: State = {hasError: false}

    static getDerivedStateFromError(): State {
        return {hasError: true}
    }

    componentDidCatch() {
        // Contained: avoid crashing the shell; details stay in the console for debugging.
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="preview-error-boundary" role="alert" dir="rtl">
                    <p>پیش‌نمایش به خاطر محتوای نامعتبر از کار افتاد.</p>
                    <button type="button" className="btn btn-secondary" onClick={this.retry}>
                        تلاش مجدد
                    </button>
                </div>
            )
        }
        return this.props.children
    }

    private retry = () => {
        this.setState({hasError: false})
    }
}
